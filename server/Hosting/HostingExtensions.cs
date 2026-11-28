using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace SeedsBank.Server.Hosting;

// Same-origin hosting: one process serves the API (under /api) and the built React app.
public static class HostingExtensions
{
    public const string LoginPolicy = "login";
    public const string SignupPolicy = "signup";
    public const string TooManyAttemptsMessage = "Too many attempts, try again in a minute.";

    public static bool ForwardedHeadersEnabled(this IConfiguration configuration) =>
        configuration.GetValue<bool>("ForwardedHeaders:Enabled");

    public static IServiceCollection AddSameOriginHosting(this IServiceCollection services, IConfiguration configuration)
    {
        if (configuration.ForwardedHeadersEnabled())
        {
            services.Configure<ForwardedHeadersOptions>(o =>
            {
                // Never XForwardedHost: the Host header must not be client-controlled.
                o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                // Only safe when the app is reachable solely through the platform's proxy
                // (it overwrites X-Forwarded-*). Exposed directly, clients could spoof their IP
                // and so bypass the per-IP rate limits.
                o.KnownIPNetworks.Clear();
                o.KnownProxies.Clear();
            });
            // The proxy terminates TLS on the standard port, so redirects name no explicit port.
            services.Configure<HttpsRedirectionOptions>(o => o.HttpsPort = 443);
        }

        services.AddOptions<RateLimitOptions>()
            .Bind(configuration.GetSection(RateLimitOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddOptions<LoginThrottleOptions>()
            .Bind(configuration.GetSection(LoginThrottleOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<ILoginThrottle, LoginThrottle>();
        services.AddScoped<LoginThrottleFilter>();
        services.AddHealthChecks();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
                }
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { message = TooManyAttemptsMessage }, ct);
            };
            options.AddPolicy(LoginPolicy, http => PerIp(http, o => (o.LoginPermitLimit, o.LoginWindowSeconds), LoginPolicy));
            options.AddPolicy(SignupPolicy, http => PerIp(http, o => (o.SignupPermitLimit, o.SignupWindowSeconds), SignupPolicy));
        });

        return services;
    }

    private static RateLimitPartition<string> PerIp(
        HttpContext http, Func<RateLimitOptions, (int Permits, int Seconds)> pick, string policy)
    {
        var (permits, seconds) = pick(http.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value);
        var ip = http.Connection.RemoteIpAddress ?? IPAddress.None;
        return RateLimitPartition.GetFixedWindowLimiter($"{policy}:{ip}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permits,
            Window = TimeSpan.FromSeconds(seconds),
            QueueLimit = 0,
        });
    }

    // index.html must always be revalidated so a new deploy is picked up; hashed assets can be cached.
    private static readonly StaticFileOptions AppFileOptions = new()
    {
        OnPrepareResponse = ctx =>
        {
            if (string.Equals(ctx.File.Name, "index.html", StringComparison.OrdinalIgnoreCase))
            {
                ctx.Context.Response.Headers.CacheControl = "no-cache";
            }
        },
    };

    // Everything that must run before authentication: proxy headers, HTTPS policy,
    // security headers, the static app files and the rate limiter.
    public static WebApplication UseSameOriginHostingPreAuth(this WebApplication app)
    {
        HostingStartupChecks.Validate(app.Configuration, app.Environment, app.Logger);

        var forwarded = app.Configuration.ForwardedHeadersEnabled();
        if (forwarded)
        {
            app.UseForwardedHeaders();
        }
        // HSTS and the HTTPS redirect only make sense behind a proxy that reports the original scheme.
        if (!app.Environment.IsDevelopment() && forwarded)
        {
            app.UseHsts();
            // The platform's health probe is plain HTTP; it must not be redirected.
            app.UseWhen(
                ctx => !ctx.Request.Path.StartsWithSegments("/api/health"),
                branch => branch.UseHttpsRedirection());
        }

        app.UseMiddleware<SecurityHeadersMiddleware>();
        app.UseDefaultFiles();
        app.UseStaticFiles(AppFileOptions);
        // After forwarded headers (real client IP), before authentication.
        app.UseRateLimiter();
        return app;
    }

    // Endpoints, after UseAuthentication / UseAuthorization.
    public static WebApplication MapSameOriginHosting(this WebApplication app)
    {
        app.MapControllers();
        app.MapHealthChecks("/api/health");
        // Unknown API routes are 404s; so is a missing file (path with an extension, e.g. /uploads/x.jpg).
        // Everything else is the React app (client-side routing).
        app.MapFallback("/api/{**rest}", () => Results.NotFound());
        app.MapFallbackToFile("{*path:nonfile}", "index.html", AppFileOptions);
        return app;
    }
}
