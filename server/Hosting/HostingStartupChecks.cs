namespace SeedsBank.Server.Hosting;

// Fail-fast checks so a deployment can't silently run with unsafe hosting defaults.
public static class HostingStartupChecks
{
    public static void Validate(IConfiguration configuration, IHostEnvironment environment, ILogger logger)
    {
        if (environment.IsDevelopment()) return;

        var forwarded = configuration["ForwardedHeaders:Enabled"];
        if (string.IsNullOrWhiteSpace(forwarded))
        {
            throw new InvalidOperationException(
                "ForwardedHeaders:Enabled must be set explicitly outside Development (true behind a reverse proxy " +
                "such as Render's, false when clients connect directly).");
        }

        if (!configuration.GetValue<bool>("ForwardedHeaders:Enabled"))
        {
            logger.LogWarning(
                "ForwardedHeaders:Enabled is false: per-IP rate limits see the proxy's IP, so all users share one limit.");
        }

        var allowedHosts = configuration["AllowedHosts"];
        var anyHost = string.IsNullOrWhiteSpace(allowedHosts)
            || allowedHosts.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Contains("*");
        if (anyHost && !configuration.GetValue<bool>("Hosting:AllowAnyHost"))
        {
            throw new InvalidOperationException(
                "AllowedHosts is '*' or empty. Set AllowedHosts to this deployment's host name(s), " +
                "or set Hosting:AllowAnyHost=true to accept any Host header deliberately.");
        }
    }
}
