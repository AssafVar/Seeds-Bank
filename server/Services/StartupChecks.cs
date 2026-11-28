using System.Text;

namespace SeedsBank.Server.Services;

// Configuration checks that stop the app at startup with a clear message
// instead of failing on the first request. Called after Build() so that
// `dotnet ef` (which builds the host but never runs it) still works without
// secrets.
public static class StartupChecks
{
    public const int MinJwtKeyBytes = 32;

    // The committed key in appsettings.Development.json. It is public, so a
    // real deployment must never sign tokens with it.
    public const string DevJwtKey = "xmX6rsrYVt9envuTMxMo588fNM2a5cXvYrpoQh8tglYb47su6wMIshlzWPokNsmK";

    public static void Validate(IConfiguration configuration, bool isDevelopment)
    {
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException(
                "Jwt:Key is not set. Set it to a random secret of at least 32 bytes (for example `openssl rand -base64 48`), " +
                "through user secrets or the Jwt__Key environment variable.");
        }

        if (Encoding.UTF8.GetByteCount(key) < MinJwtKeyBytes)
        {
            throw new InvalidOperationException(
                $"Jwt:Key is too short: it must be at least {MinJwtKeyBytes} bytes (for example `openssl rand -base64 48`).");
        }

        if (!isDevelopment && key == DevJwtKey)
        {
            throw new InvalidOperationException(
                "Jwt:Key is the development key from appsettings.Development.json. Set a private secret outside Development.");
        }

        if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Default")))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Default is not set. Set it to a Postgres connection string (ConnectionStrings__Default).");
        }

        ValidateStorage(configuration, isDevelopment);
        ValidateEmail(configuration);
    }

    private static void ValidateStorage(IConfiguration configuration, bool isDevelopment)
    {
        var missing = new[] { "ServiceUrl", "Bucket", "AccessKey", "SecretKey" }
            .Where(name => string.IsNullOrWhiteSpace(configuration[$"Storage:{name}"]))
            .Select(name => $"Storage:{name}")
            .ToList();
        if (missing.Count > 0)
        {
            throw new InvalidOperationException(
                $"File storage is not configured: set {string.Join(", ", missing)} (for example Storage__Bucket).");
        }

        if (!Uri.TryCreate(configuration["Storage:ServiceUrl"], UriKind.Absolute, out var serviceUrl)
            || serviceUrl.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException("Storage:ServiceUrl must be an absolute http(s) URL.");
        }
        if (!isDevelopment && serviceUrl.Scheme != "https")
        {
            throw new InvalidOperationException("Storage:ServiceUrl must use https outside Development.");
        }

        // It goes into the Content-Security-Policy header, so it must be a bare origin.
        var publicOrigin = configuration["Storage:PublicOrigin"];
        if (!string.IsNullOrWhiteSpace(publicOrigin) && !IsOrigin(publicOrigin))
        {
            throw new InvalidOperationException(
                "Storage:PublicOrigin must be an origin such as https://files.example.com (scheme and host, no path).");
        }
    }

    private static void ValidateEmail(IConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(configuration["Email:Host"])) return;
        if (string.IsNullOrWhiteSpace(configuration["Email:From"]))
        {
            throw new InvalidOperationException("Email:Host is set but Email:From is not: set the sender address.");
        }
    }

    private static bool IsOrigin(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && uri.Scheme is "http" or "https"
        && uri.GetLeftPart(UriPartial.Authority) == value.TrimEnd('/')
        && !value.EndsWith('/');
}
