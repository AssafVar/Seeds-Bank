using Microsoft.Extensions.Options;
using SeedsBank.Server.Storage;

namespace SeedsBank.Server.Hosting;

// Adds the baseline response headers to every answer, including the static app files.
public class SecurityHeadersMiddleware
{
    // No blob: (the client never creates object URLs) and no data: fonts (none are embedded);
    // data: stays in img-src because the build inlines Leaflet's marker/layer PNGs as data URIs.
    // Allows exactly what the client loads: its own bundle, OpenStreetMap / OpenTopoMap / Esri map
    // tiles (Leaflet), Open-Meteo and Nominatim calls made from the browser, and YouTube / Vimeo
    // embeds. 'unsafe-inline' for styles is needed by MUI's runtime styles and Leaflet's inline
    // styling; scripts are 'self' only (the client build sets INLINE_RUNTIME_CHUNK=false).
    // storageOrigin (Storage:PublicOrigin) is where gallery images load from: signed links to the private bucket.
    public static string BuildContentSecurityPolicy(string? storageOrigin) =>
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https://*.tile.openstreetmap.org https://*.tile.opentopomap.org https://server.arcgisonline.com" +
        (string.IsNullOrWhiteSpace(storageOrigin) ? "" : " " + storageOrigin) + "; " +
        "font-src 'self'; " +
        "connect-src 'self' https://api.open-meteo.com https://nominatim.openstreetmap.org; " +
        "frame-src https://www.youtube.com https://player.vimeo.com; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'";

    // The client uses none of these features (no navigator.geolocation, camera, microphone or payments).
    public const string PermissionsPolicy =
        "geolocation=(), camera=(), microphone=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()";

    private readonly RequestDelegate _next;
    private readonly bool _skipCspForSwagger;
    private readonly string _contentSecurityPolicy;

    public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env, IOptions<StorageOptions> storage)
    {
        _next = next;
        _skipCspForSwagger = env.IsDevelopment();
        _contentSecurityPolicy = BuildContentSecurityPolicy(storage.Value.PublicOrigin);
    }

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["X-Frame-Options"] = "DENY";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            headers["Permissions-Policy"] = PermissionsPolicy;
            // Swagger UI uses inline scripts; it only exists in Development.
            if (!(_skipCspForSwagger && context.Request.Path.StartsWithSegments("/swagger")))
            {
                headers["Content-Security-Policy"] = _contentSecurityPolicy;
            }
            return Task.CompletedTask;
        });
        return _next(context);
    }
}
