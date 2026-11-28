using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Hosting;

public interface ILoginThrottle
{
    // How long the email must wait, or null when it may try.
    TimeSpan? GetRetryAfter(string email);
    void RecordFailure(string email);
    void Reset(string email);
}

// Counts failed logins per normalized email in a size-limited in-memory cache. Unknown emails are
// counted exactly like known ones, so the throttle never reveals whether an account exists.
// Single-instance only; when the cache is full new emails are simply not tracked (the per-IP limit still applies).
public sealed class LoginThrottle : ILoginThrottle, IDisposable
{
    private sealed class Entry
    {
        public readonly object Gate = new();
        public int Failures;
        public DateTimeOffset WindowEnd;
        public DateTimeOffset BlockedUntil;
    }

    private readonly MemoryCache _cache;
    private readonly LoginThrottleOptions _options;
    private readonly TimeProvider _time;

    public LoginThrottle(IOptions<LoginThrottleOptions> options, TimeProvider time)
    {
        _options = options.Value;
        _time = time;
        _cache = new MemoryCache(new MemoryCacheOptions { SizeLimit = _options.MaxTrackedAccounts });
    }

    public static string Normalize(string email)
    {
        var key = email.Trim().ToLowerInvariant();
        return key.Length > 256 ? key[..256] : key;
    }

    public TimeSpan? GetRetryAfter(string email)
    {
        if (!_cache.TryGetValue(Normalize(email), out Entry? entry) || entry is null) return null;
        lock (entry.Gate)
        {
            var remaining = entry.BlockedUntil - _time.GetUtcNow();
            return remaining > TimeSpan.Zero ? remaining : null;
        }
    }

    public void RecordFailure(string email)
    {
        var now = _time.GetUtcNow();
        var window = TimeSpan.FromMinutes(_options.WindowMinutes);
        var entry = _cache.GetOrCreate(Normalize(email), e =>
        {
            e.Size = 1;
            e.AbsoluteExpirationRelativeToNow = window;
            return new Entry { WindowEnd = now + window };
        })!;
        lock (entry.Gate)
        {
            if (now >= entry.WindowEnd)
            {
                entry.Failures = 0;
                entry.WindowEnd = now + window;
            }
            entry.Failures++;
            if (entry.Failures >= _options.MaxFailures)
            {
                entry.BlockedUntil = now + TimeSpan.FromSeconds(_options.BackoffSeconds);
            }
        }
    }

    public void Reset(string email) => _cache.Remove(Normalize(email));

    public void Dispose() => _cache.Dispose();
}

// Wraps the login action: refuses a backed-off email before any password check, counts
// 401s as failures and resets the counter on success. Validation errors (400) are not counted.
public class LoginThrottleFilter : IAsyncActionFilter
{
    private readonly ILoginThrottle _throttle;

    public LoginThrottleFilter(ILoginThrottle throttle) => _throttle = throttle;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var request = context.ActionArguments.Values.OfType<LoginRequest>().FirstOrDefault();
        if (request?.Email is null)
        {
            await next();
            return;
        }

        var retryAfter = _throttle.GetRetryAfter(request.Email);
        if (retryAfter is not null)
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.Value.TotalSeconds)).ToString();
            context.Result = new ObjectResult(new { message = HostingExtensions.TooManyAttemptsMessage })
            {
                StatusCode = StatusCodes.Status429TooManyRequests,
            };
            return;
        }

        var executed = await next();
        switch (executed.Result)
        {
            case UnauthorizedObjectResult or UnauthorizedResult:
                _throttle.RecordFailure(request.Email);
                break;
            case OkObjectResult:
                _throttle.Reset(request.Email);
                break;
        }
    }
}
