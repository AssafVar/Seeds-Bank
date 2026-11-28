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
    }
}
