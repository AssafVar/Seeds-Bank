using System.Text.Json;
using Microsoft.Extensions.Configuration;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class StartupChecksTests
{
    private const string GoodKey = "0123456789abcdef0123456789abcdef";
    private const string Conn = "Host=localhost;Database=x;Username=u;Password=p";

    private static IConfiguration Config(string? jwtKey, string? connection)
    {
        var values = new Dictionary<string, string?>();
        if (jwtKey is not null) values["Jwt:Key"] = jwtKey;
        if (connection is not null) values["ConnectionStrings:Default"] = connection;
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    [Fact]
    public void Valid_configuration_passes()
    {
        StartupChecks.Validate(Config(GoodKey, Conn), isDevelopment: false);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Missing_jwt_key_is_rejected_with_a_clear_message(string? key)
    {
        var ex = Assert.Throws<InvalidOperationException>(() => StartupChecks.Validate(Config(key, Conn), true));
        Assert.Contains("Jwt:Key is not set", ex.Message);
    }

    [Fact]
    public void Jwt_key_shorter_than_32_bytes_is_rejected()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => StartupChecks.Validate(Config(new string('a', 31), Conn), true));
        Assert.Contains("at least 32 bytes", ex.Message);
    }

    [Fact]
    public void Jwt_key_of_exactly_32_bytes_is_accepted()
    {
        StartupChecks.Validate(Config(new string('a', 32), Conn), true);
    }

    [Fact]
    public void Dev_key_is_rejected_outside_development_but_allowed_in_development()
    {
        StartupChecks.Validate(Config(StartupChecks.DevJwtKey, Conn), isDevelopment: true);

        var ex = Assert.Throws<InvalidOperationException>(
            () => StartupChecks.Validate(Config(StartupChecks.DevJwtKey, Conn), isDevelopment: false));
        Assert.Contains("development key", ex.Message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void Missing_connection_string_is_rejected(string? connection)
    {
        var ex = Assert.Throws<InvalidOperationException>(() => StartupChecks.Validate(Config(GoodKey, connection), true));
        Assert.Contains("ConnectionStrings:Default", ex.Message);
    }

    [Fact]
    public void Committed_development_settings_use_the_dev_key_the_check_knows_about()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "appsettings.Development.json")))
        {
            dir = dir.Parent;
        }
        Assert.NotNull(dir);

        using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(dir!.FullName, "appsettings.Development.json")));
        Assert.Equal(StartupChecks.DevJwtKey, doc.RootElement.GetProperty("Jwt").GetProperty("Key").GetString());
    }

    [Fact]
    public void Base_settings_ship_no_secrets()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "appsettings.json")) )
        {
            dir = dir.Parent;
        }
        Assert.NotNull(dir);

        using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(dir!.FullName, "appsettings.json")));
        Assert.Equal("", doc.RootElement.GetProperty("Jwt").GetProperty("Key").GetString());
        Assert.Equal("", doc.RootElement.GetProperty("ConnectionStrings").GetProperty("Default").GetString());
        Assert.False(doc.RootElement.GetProperty("Database").GetProperty("MigrateOnStartup").GetBoolean());
    }
}
