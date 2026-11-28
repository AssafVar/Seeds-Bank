using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace SeedsBank.Server.Hosting;

// Same-origin hosting: one process serves the API (under /api) and the built React app.
public static class HostingExtensions
{
    public const string LoginPolicy = "login";
    public const string SignupPolicy = "signup";

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
        }

        services.Configure<RateLimitOptions>(configuration.GetSection(RateLimitOptions.SectionName));
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
                    new { message = "Too many attempts, try again in a minute." }, ct);
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

    // Everything that must run before authentication: proxy headers, HTTPS policy,
    // security headers and the static app files.
    public static WebApplication UseSameOriginHostingPreAuth(this WebApplication app)
    {
        var forwarded = app.Configuration.ForwardedHeadersEnabled();
        if (forwarded)
        {
            app.UseForwardedHeaders();
        }
        // HSTS and the HTTPS redirect only make sense behind a proxy that reports the original scheme.
        if (!app.Environment.IsDevelopment() && forwarded)
        {
            app.UseHsts();
            app.UseHttpsRedirection();
        }

        app.UseMiddleware<SecurityHeadersMiddleware>();
        app.UseDefaultFiles();
        app.UseStaticFiles();
        return app;
    }

    // Endpoints, after UseAuthentication / UseAuthorization.
    public static WebApplication MapSameOriginHosting(this WebApplication app)
    {
        app.UseRateLimiter();
        app.MapControllers();
        app.MapHealthChecks("/api/health");
        // Unknown API routes are 404s; everything else is the React app (client-side routing).
        app.MapFallback("/api/{**rest}", () => Results.NotFound());
        app.MapFallbackToFile("index.html");
        return app;
    }
}
