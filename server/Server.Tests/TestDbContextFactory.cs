using Microsoft.EntityFrameworkCore;
using Npgsql;
using SeedsBank.Server.Data;

namespace SeedsBank.Server.Tests;

// A fresh in-memory database per call, keyed by a random name, so tests
// never see state left behind by another test.
public static class TestDbContextFactory
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    // A real Postgres database, uniquely named and migrated, for the tests the
    // in-memory provider cannot answer (indexes, citext, SQL translation,
    // transactions). TEST_POSTGRES is an admin connection string; the database
    // is dropped when the returned handle is disposed.
    public static PostgresTestDb CreatePostgres()
    {
        var admin = Environment.GetEnvironmentVariable("TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(admin))
        {
            throw new InvalidOperationException(
                "TEST_POSTGRES is not set. Set it to a Postgres connection string (see PostgresFactAttribute).");
        }

        var name = "seeds_bank_test_" + Guid.NewGuid().ToString("N");
        using (var connection = new NpgsqlConnection(admin))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = $"CREATE DATABASE \"{name}\"";
            command.ExecuteNonQuery();
        }

        var builder = new NpgsqlConnectionStringBuilder(admin) { Database = name, Pooling = true };
        var db = new PostgresTestDb(admin, builder.ConnectionString, name);
        using var context = db.NewContext();
        context.Database.Migrate();
        return db;
    }
}

public sealed class PostgresTestDb : IDisposable
{
    private readonly string _adminConnectionString;

    internal PostgresTestDb(string adminConnectionString, string connectionString, string name)
    {
        _adminConnectionString = adminConnectionString;
        ConnectionString = connectionString;
        Name = name;
    }

    public string ConnectionString { get; }
    public string Name { get; }

    // Each call is a separate context (and connection), like one request.
    public AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options);

    public void Dispose()
    {
        NpgsqlConnection.ClearAllPools();
        using var connection = new NpgsqlConnection(_adminConnectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"DROP DATABASE IF EXISTS \"{Name}\" WITH (FORCE)";
        command.ExecuteNonQuery();
    }
}
