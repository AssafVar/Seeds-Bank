namespace SeedsBank.Server.Tests;

// A fact that needs a real Postgres server. TEST_POSTGRES holds an admin
// connection string (for example the compose one:
// Host=localhost;Port=5433;Database=seeds_bank;Username=seeds_bank;Password=seeds_bank_dev).
// Unset locally: the test is skipped. Unset when CI=true: the test fails, so a
// CI run can never go green by silently skipping the Postgres tests.
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TEST_POSTGRES"))) return;

        var ci = string.Equals(Environment.GetEnvironmentVariable("CI"), "true", StringComparison.OrdinalIgnoreCase);
        if (!ci)
        {
            Skip = "TEST_POSTGRES is not set (start `docker compose up -d postgres` and set it to run the Postgres tests).";
        }
        // In CI the test runs and TestDbContextFactory.CreatePostgres() fails it with a clear message.
    }
}
