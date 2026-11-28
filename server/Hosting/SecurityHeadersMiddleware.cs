namespace SeedsBank.Server.Hosting;

// Adds the baseline response headers to every answer, including the static app files.
public class SecurityHeadersMiddleware
{
    // Allows exactly what the client loads: its own bundle, OpenStreetMap / OpenTopoMap / Esri map
    // tiles (Leaflet), Open-Meteo and Nominatim calls made from the browser, and YouTube / Vimeo
    // embeds. 'unsafe-inline' for styles is needed by MUI's runtime styles and Leaflet's inline
    // styling; scripts are 'self' only (the client build sets INLINE_RUNTIME_CHUNK=false).
    public const string ContentSecurityPolicy =
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.tile.opentopomap.org https://server.arcgisonline.com; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://api.open-meteo.com https://nominatim.openstreetmap.org; " +
        "frame-src https://www.youtube.com https://player.vimeo.com; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'";

    private readonly RequestDelegate _next;
    private readonly bool _skipCspForSwagger;

    public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _skipCspForSwagger = env.IsDevelopment();
    }

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["X-Frame-Options"] = "DENY";
            // Swagger UI uses inline scripts; it only exists in Development.
            if (!(_skipCspForSwagger && context.Request.Path.StartsWithSegments("/swagger")))
            {
                headers["Content-Security-Policy"] = ContentSecurityPolicy;
            }
            return Task.CompletedTask;
        });
        return _next(context);
    }
}
