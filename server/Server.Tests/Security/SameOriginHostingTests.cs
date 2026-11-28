using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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
        _client.Dispose();
        await _app.DisposeAsync();
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }

    private async Task StartAsync(bool withIndex, bool forwarded)
    {
        if (_app is not null)
        {
            _client.Dispose();
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
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ForwardedHeaders:Enabled"] = forwarded ? "true" : "false",
        });

        var auth = new Mock<IAuthService>();
        auth.Setup(a => a.LoginAsync(It.IsAny<LoginRequest>())).ReturnsAsync((LoginResponse?)null);
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
        _client = new HttpClient { BaseAddress = new Uri(address) };
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
    }

    [Fact]
    public async Task Login_IsLimitedTo10PerMinutePerIp_With429Json()
    {
        for (var i = 0; i < 10; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PostAsJsonAsync("/api/users/login", Login())).StatusCode);
        }

        var limited = await _client.PostAsJsonAsync("/api/users/login", Login());

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

        async Task<HttpStatusCode> LoginFrom(string ip)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/users/login") { Content = JsonContent.Create(Login()) };
            request.Headers.Add("X-Forwarded-For", ip);
            return (await _client.SendAsync(request)).StatusCode;
        }

        for (var i = 0; i < 10; i++) await LoginFrom("203.0.113.1");

        Assert.Equal(HttpStatusCode.TooManyRequests, await LoginFrom("203.0.113.1"));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginFrom("203.0.113.2"));
    }
}
