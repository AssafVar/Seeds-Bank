using System.Text.Json;
using Microsoft.Extensions.Configuration;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class StartupChecksTests
{
    private const string GoodKey = "0123456789abcdef0123456789abcdef";
    private const string Conn = "Host=localhost;Database=x;Username=u;Password=p";

    private static IConfiguration Config(string? jwtKey, string? connection, Dictionary<string, string?>? overrides = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["Storage:ServiceUrl"] = "https://account.r2.cloudflarestorage.com",
            ["Storage:Bucket"] = "seeds-bank",
            ["Storage:AccessKey"] = "key",
            ["Storage:SecretKey"] = "secret",
        };
        if (jwtKey is not null) values["Jwt:Key"] = jwtKey;
        if (connection is not null) values["ConnectionStrings:Default"] = connection;
        foreach (var (key, value) in overrides ?? new()) values[key] = value;
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    private static InvalidOperationException Rejects(Dictionary<string, string?> overrides, bool isDevelopment = false) =>
        Assert.Throws<InvalidOperationException>(() => StartupChecks.Validate(Config(GoodKey, Conn, overrides), isDevelopment));

    [Theory]
    [InlineData("Storage:ServiceUrl")]
    [InlineData("Storage:Bucket")]
    [InlineData("Storage:AccessKey")]
    [InlineData("Storage:SecretKey")]
    public void Missing_storage_setting_is_rejected_by_name(string name)
    {
        var ex = Rejects(new() { [name] = "" }, isDevelopment: true);
        Assert.Contains(name, ex.Message);
    }

    [Fact]
    public void Plain_http_storage_is_allowed_in_development_only()
    {
        var local = new Dictionary<string, string?> { ["Storage:ServiceUrl"] = "http://localhost:9100" };
        StartupChecks.Validate(Config(GoodKey, Conn, local), isDevelopment: true);

        Assert.Contains("https", Rejects(local).Message);
    }

    [Theory]
    [InlineData("not a url")]
    [InlineData("ftp://files.example.test")]
    public void Storage_service_url_must_be_http_or_https(string url)
    {
        Assert.Contains("Storage:ServiceUrl", Rejects(new() { ["Storage:ServiceUrl"] = url }, isDevelopment: true).Message);
    }

    [Theory]
    [InlineData("https://files.example.test")]
    [InlineData("http://localhost:9100")]
    public void Storage_public_origin_accepts_a_bare_origin(string origin)
    {
        StartupChecks.Validate(Config(GoodKey, Conn, new() { ["Storage:PublicOrigin"] = origin }), isDevelopment: false);
    }

    [Theory]
    [InlineData("https://files.example.test/")]
    [InlineData("https://files.example.test/bucket")]
    [InlineData("https://files.example.test; script-src *")]
    [InlineData("files.example.test")]
    [InlineData("javascript:alert(1)")]
    public void Storage_public_origin_that_is_not_a_bare_origin_is_rejected(string origin)
    {
        Assert.Contains("Storage:PublicOrigin", Rejects(new() { ["Storage:PublicOrigin"] = origin }).Message);
    }

    [Fact]
    public void Email_host_without_a_sender_is_rejected()
    {
        Assert.Contains("Email:From", Rejects(new() { ["Email:Host"] = "smtp.resend.com" }).Message);

        StartupChecks.Validate(
            Config(GoodKey, Conn, new() { ["Email:Host"] = "smtp.resend.com", ["Email:From"] = "noreply@example.test" }),
            isDevelopment: false);
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

        using var doc = JsonDocument.Parse(
            File.ReadAllText(Path.Combine(dir!.FullName, "appsettings.json")),
            // Like the configuration loader, accept // comments and trailing commas.
            new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
        Assert.Equal("", doc.RootElement.GetProperty("Jwt").GetProperty("Key").GetString());
        Assert.Equal("", doc.RootElement.GetProperty("ConnectionStrings").GetProperty("Default").GetString());
        Assert.False(doc.RootElement.GetProperty("Database").GetProperty("MigrateOnStartup").GetBoolean());
    }
}
