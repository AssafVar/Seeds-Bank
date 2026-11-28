using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Hosting;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Security;

// Runs the real hosting pipeline (static files, fallbacks, headers, rate limits) on a Kestrel
// instance bound to a free local port, with the auth service mocked.
public class SameOriginHostingTests : IAsyncLifetime
{
    private const string IndexHtml = "<html><body>seeds-bank-app</body></html>";

    private readonly string _root = Path.Combine(Path.GetTempPath(), "seedsbank-host-" + Guid.NewGuid());
    private WebApplication _app = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync() => await StartAsync(withIndex: true, forwarded: false);

    public async Task DisposeAsync()
    {
        _client?.Dispose();
        await _app.DisposeAsync();
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }

    private async Task StartAsync(bool withIndex, bool forwarded, Dictionary<string, string?>? extra = null)
    {
        if (_app is not null)
        {
            _client?.Dispose();
            await _app.DisposeAsync();
        }
        Directory.CreateDirectory(Path.Combine(_root, "wwwroot"));
        var index = Path.Combine(_root, "wwwroot", "index.html");
        if (withIndex) File.WriteAllText(index, IndexHtml);
        else if (File.Exists(index)) File.Delete(index);

        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ContentRootPath = _root,
            WebRootPath = Path.Combine(_root, "wwwroot"),
            EnvironmentName = "Production",
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        var config = new Dictionary<string, string?>
        {
            ["ForwardedHeaders:Enabled"] = forwarded ? "true" : "false",
            ["AllowedHosts"] = "127.0.0.1;app.example.test",
        };
        foreach (var (key, value) in extra ?? new()) config[key] = value;
        builder.Configuration.AddInMemoryCollection(config);

        var auth = new Mock<IAuthService>();
        auth.Setup(a => a.LoginAsync(It.IsAny<LoginRequest>())).ReturnsAsync((LoginRequest r) =>
            r.Password == "right-pass" ? new LoginResponse { UserId = "u1", Email = r.Email, Token = "t" } : null);
        auth.Setup(a => a.SignupAsync(It.IsAny<SignupRequest>())).ReturnsAsync(true);
        builder.Services.AddSingleton(auth.Object);
        builder.Services.AddControllers().AddApplicationPart(typeof(UsersController).Assembly);
        builder.Services.AddAuthentication().AddJwtBearer();
        builder.Services.AddAuthorization();
        builder.Services.AddSameOriginHosting(builder.Configuration);

        _app = builder.Build();
        _app.UseSameOriginHostingPreAuth();
        _app.UseAuthentication();
        _app.UseAuthorization();
        _app.MapSameOriginHosting();
        await _app.StartAsync();

        var address = _app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.First();
        _client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { BaseAddress = new Uri(address) };
    }

    private static LoginRequest Login() => new() { Email = "a@b.com", Password = "secret1" };

    private static SignupRequest Signup() => new() { UserId = "u1", Email = "a@b.com", Password = "secret1" };

    [Fact]
    public async Task UnknownApiRoute_Returns404_NotTheApp()
    {
        var response = await _client.GetAsync("/api/zzz");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.DoesNotContain("seeds-bank-app", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/projects")]
    [InlineData("/projects/abc/fields")]
    [InlineData("/news")]
    public async Task NonApiPath_ReturnsIndexHtml(string path)
    {
        var response = await _client.GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(IndexHtml, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task NonApiPath_WithoutBuiltApp_Returns404()
    {
        await StartAsync(withIndex: false, forwarded: false);

        var response = await _client.GetAsync("/projects");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Health_Returns200()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ApiRoute_ReachesTheController_AndOldUnprefixedRouteDoesNot()
    {
        var prefixed = await _client.PostAsJsonAsync("/api/users/login", Login());
        var legacy = await _client.PostAsJsonAsync("/users/login", Login());

        Assert.Equal(HttpStatusCode.Unauthorized, prefixed.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, legacy.StatusCode);
        Assert.NotEqual(HttpStatusCode.OK, legacy.StatusCode);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/api/zzz")]
    public async Task SecurityHeaders_AreOnEveryResponse(string path)
    {
        var response = await _client.GetAsync(path);

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal(SecurityHeadersMiddleware.ContentSecurityPolicy, response.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Equal("same-origin", response.Headers.GetValues("Cross-Origin-Opener-Policy").Single());
        Assert.Equal(SecurityHeadersMiddleware.PermissionsPolicy, response.Headers.GetValues("Permissions-Policy").Single());
    }

    [Fact]
    public void Csp_HasNoBlobAndNoDataFonts()
    {
        Assert.DoesNotContain("blob:", SecurityHeadersMiddleware.ContentSecurityPolicy);
        Assert.Contains("font-src 'self';", SecurityHeadersMiddleware.ContentSecurityPolicy);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/projects/abc")]
    public async Task IndexHtml_IsServedWithNoCache(string path)
    {
        var response = await _client.GetAsync(path);

        Assert.Equal("no-cache", response.Headers.CacheControl?.ToString());
    }

    [Theory]
    [InlineData("/uploads/missing.jpg")]
    [InlineData("/foo.js")]
    [InlineData("/static/js/gone.abc.js")]
    public async Task MissingFile_Returns404_NotIndexHtml(string path)
    {
        var response = await _client.GetAsync(path);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.DoesNotContain("seeds-bank-app", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task BehindProxy_PlainHttpIsRedirectedToHttps_HealthIsNot_AndHttpsGetsHsts()
    {
        await StartAsync(withIndex: true, forwarded: true);

        async Task<HttpResponseMessage> Get(string path, string? proto)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            request.Headers.Host = "app.example.test";
            if (proto is not null) request.Headers.Add("X-Forwarded-Proto", proto);
            return await _client.SendAsync(request);
        }

        var redirect = await Get("/projects", "http");
        var health = await Get("/api/health", "http");
        var secure = await Get("/projects", "https");

        Assert.Equal(HttpStatusCode.TemporaryRedirect, redirect.StatusCode);
        Assert.Equal("https://app.example.test/projects", redirect.Headers.Location?.ToString());
        Assert.Equal(HttpStatusCode.OK, health.StatusCode);
        Assert.Equal(HttpStatusCode.OK, secure.StatusCode);
        Assert.True(secure.Headers.Contains("Strict-Transport-Security"));
        Assert.False(health.Headers.Contains("Strict-Transport-Security"));
    }

    [Fact]
    public async Task WithoutForwardedHeaders_NoRedirectAndNoHsts()
    {
        var response = await _client.GetAsync("/projects");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Strict-Transport-Security"));
    }

    [Theory]
    [InlineData("RateLimiting:LoginPermitLimit", "0")]
    [InlineData("RateLimiting:SignupWindowSeconds", "-5")]
    [InlineData("LoginThrottle:MaxFailures", "0")]
    [InlineData("LoginThrottle:BackoffSeconds", "999999")]
    public async Task InvalidLimitOptions_StopStartup(string key, string value)
    {
        await Assert.ThrowsAsync<OptionsValidationException>(() =>
            StartAsync(withIndex: true, forwarded: false, new() { [key] = value }));
    }

    [Fact]
    public async Task Login_IsThrottledPerAccount_AfterFiveFailures_WithTheSameGenericAnswer()
    {
        for (var i = 0; i < 5; i++)
        {
            var failed = await _client.PostAsJsonAsync("/api/users/login", new LoginRequest { Email = "Someone@Example.com", Password = "bad" });
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        // Same account in another letter case is blocked, even with the right password.
        var blocked = await _client.PostAsJsonAsync("/api/users/login", new LoginRequest { Email = "someone@example.com", Password = "right-pass" });
        var other = await _client.PostAsJsonAsync("/api/users/login", new LoginRequest { Email = "other@example.com", Password = "bad" });

        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        Assert.Contains("Too many attempts", await blocked.Content.ReadAsStringAsync());
        Assert.True(blocked.Headers.Contains("Retry-After"));
        Assert.Equal(HttpStatusCode.Unauthorized, other.StatusCode);
    }

    [Fact]
    public async Task Login_Success_ResetsTheAccountCounter()
    {
        for (var round = 0; round < 2; round++)
        {
            for (var i = 0; i < 4; i++)
            {
                await _client.PostAsJsonAsync("/api/users/login", new LoginRequest { Email = "a@b.com", Password = "bad" });
            }
            var ok = await _client.PostAsJsonAsync("/api/users/login", new LoginRequest { Email = "a@b.com", Password = "right-pass" });
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        }
    }

    [Fact]
    public async Task Login_ValidationErrors_AreNotCountedAsFailures()
    {
        for (var i = 0; i < 8; i++)
        {
            var invalid = await _client.PostAsJsonAsync("/api/users/login", new { email = "not-an-email", password = "x" });
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        }
    }

    [Fact]
    public async Task Login_IsLimitedTo10PerMinutePerIp_With429Json()
    {
        // A different email each time, so only the per-IP limit (not the per-account throttle) can trip.
        for (var i = 0; i < 10; i++)
        {
            var attempt = new LoginRequest { Email = $"u{i}@b.com", Password = "bad" };
            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostAsJsonAsync("/api/users/login", attempt)).StatusCode);
        }

        var limited = await _client.PostAsJsonAsync("/api/users/login", new LoginRequest { Email = "u10@b.com", Password = "bad" });

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("application/json", limited.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Too many attempts", await limited.Content.ReadAsStringAsync());
        Assert.True(limited.Headers.Contains("Retry-After"));
    }

    [Fact]
    public async Task Signup_IsLimitedTo5PerHourPerIp_AndIndependentOfLogin()
    {
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await _client.PostAsJsonAsync("/api/users/signup", Signup())).StatusCode);
        }

        var limited = await _client.PostAsJsonAsync("/api/users/signup", Signup());
        var login = await _client.PostAsJsonAsync("/api/users/login", Login());

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task WithForwardedHeaders_TheLimitIsPerForwardedClientIp()
    {
        await StartAsync(withIndex: true, forwarded: true);

        var n = 0;
        async Task<HttpStatusCode> LoginFrom(string ip)
        {
            var attempt = new LoginRequest { Email = $"u{n++}@b.com", Password = "bad" };
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/users/login") { Content = JsonContent.Create(attempt) };
            request.Headers.Add("X-Forwarded-For", ip);
            request.Headers.Add("X-Forwarded-Proto", "https");
            return (await _client.SendAsync(request)).StatusCode;
        }

        for (var i = 0; i < 10; i++) await LoginFrom("203.0.113.1");

        Assert.Equal(HttpStatusCode.TooManyRequests, await LoginFrom("203.0.113.1"));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginFrom("203.0.113.2"));
    }
}
