using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SeedsBank.Server.Hosting;

namespace SeedsBank.Server.Tests.Security;

public class HostingStartupChecksTests
{
    private sealed class CapturingLogger : ILogger
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = new();
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Entries.Add((logLevel, formatter(state, exception)));
    }

    private static IConfiguration Config(params (string, string?)[] values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values.ToDictionary(v => v.Item1, v => v.Item2)).Build();

    private static IHostEnvironment Env(string name)
    {
        var env = new Mock<IHostEnvironment>();
        env.SetupGet(e => e.EnvironmentName).Returns(name);
        return env.Object;
    }

    [Fact]
    public void Production_WithoutForwardedHeadersSetting_FailsStartup()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            HostingStartupChecks.Validate(Config(("AllowedHosts", "app.example.com")), Env("Production"), new CapturingLogger()));

        Assert.Contains("ForwardedHeaders:Enabled", ex.Message);
    }

    [Theory]
    [InlineData("true")]
    [InlineData("false")]
    public void Production_WithForwardedHeadersSetExplicitly_Starts(string value)
    {
        HostingStartupChecks.Validate(
            Config(("ForwardedHeaders:Enabled", value), ("AllowedHosts", "app.example.com")), Env("Production"), new CapturingLogger());
    }

    [Fact]
    public void Production_ForwardedHeadersFalse_LogsAWarning_TrueDoesNot()
    {
        var off = new CapturingLogger();
        var on = new CapturingLogger();

        HostingStartupChecks.Validate(Config(("ForwardedHeaders:Enabled", "false"), ("AllowedHosts", "a.com")), Env("Production"), off);
        HostingStartupChecks.Validate(Config(("ForwardedHeaders:Enabled", "true"), ("AllowedHosts", "a.com")), Env("Production"), on);

        var warning = Assert.Single(off.Entries);
        Assert.Equal(LogLevel.Warning, warning.Level);
        Assert.Contains("rate limits", warning.Message);
        Assert.Empty(on.Entries);
    }

    [Theory]
    [InlineData("*")]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("a.com;*")]
    public void Production_AnyHost_FailsStartup_UnlessAllowedExplicitly(string? allowedHosts)
    {
        var without = Config(("ForwardedHeaders:Enabled", "true"), ("AllowedHosts", allowedHosts));
        var with = Config(("ForwardedHeaders:Enabled", "true"), ("AllowedHosts", allowedHosts), ("Hosting:AllowAnyHost", "true"));

        var ex = Assert.Throws<InvalidOperationException>(() => HostingStartupChecks.Validate(without, Env("Production"), new CapturingLogger()));
        HostingStartupChecks.Validate(with, Env("Production"), new CapturingLogger());

        Assert.Contains("AllowedHosts", ex.Message);
    }

    [Fact]
    public void Development_NeverFails_AndNeverWarns()
    {
        var log = new CapturingLogger();

        HostingStartupChecks.Validate(Config(("AllowedHosts", "*")), Env("Development"), log);

        Assert.Empty(log.Entries);
    }
}

public class LoginThrottleTests
{
    private sealed class FakeTime : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static (LoginThrottle Throttle, FakeTime Time) Create(Action<LoginThrottleOptions>? tweak = null)
    {
        var options = new LoginThrottleOptions();
        tweak?.Invoke(options);
        var time = new FakeTime();
        return (new LoginThrottle(Microsoft.Extensions.Options.Options.Create(options), time), time);
    }

    private static void Fail(LoginThrottle t, string email, int times)
    {
        for (var i = 0; i < times; i++) t.RecordFailure(email);
    }

    [Fact]
    public void FourFailures_DoNotBlock_TheFifthDoes_WithTheBackoffAsRetryAfter()
    {
        var (throttle, _) = Create();

        Fail(throttle, "a@b.com", 4);
        Assert.Null(throttle.GetRetryAfter("a@b.com"));
        throttle.RecordFailure("a@b.com");

        Assert.Equal(TimeSpan.FromSeconds(60), throttle.GetRetryAfter("a@b.com"));
    }

    [Fact]
    public void Email_IsNormalized_CaseAndWhitespace()
    {
        var (throttle, _) = Create();

        Fail(throttle, "  A@B.com ", 5);

        Assert.NotNull(throttle.GetRetryAfter("a@b.COM"));
    }

    [Fact]
    public void Backoff_Expires_AndIsNeverPermanent()
    {
        var (throttle, time) = Create();
        Fail(throttle, "a@b.com", 5);

        time.Now += TimeSpan.FromSeconds(61);

        Assert.Null(throttle.GetRetryAfter("a@b.com"));
    }

    [Fact]
    public void FailuresOutsideTheWindow_AreForgotten()
    {
        var (throttle, time) = Create();
        Fail(throttle, "a@b.com", 4);

        time.Now += TimeSpan.FromMinutes(16);
        throttle.RecordFailure("a@b.com");

        Assert.Null(throttle.GetRetryAfter("a@b.com"));
    }

    [Fact]
    public void Reset_ClearsTheCounter()
    {
        var (throttle, _) = Create();
        Fail(throttle, "a@b.com", 4);

        throttle.Reset("a@b.com");
        throttle.RecordFailure("a@b.com");

        Assert.Null(throttle.GetRetryAfter("a@b.com"));
    }

    [Fact]
    public void OneAccountDoesNotBlockAnother()
    {
        var (throttle, _) = Create();

        Fail(throttle, "a@b.com", 5);

        Assert.Null(throttle.GetRetryAfter("c@d.com"));
    }

    [Fact]
    public void Store_IsBounded_NewEmailsAreNotTrackedWhenFull()
    {
        var (throttle, _) = Create(o => o.MaxTrackedAccounts = 100);

        for (var i = 0; i < 500; i++) Fail(throttle, $"user{i}@x.com", 1);
        // Late arrivals past the limit are untracked, so they can never reach the threshold.
        Fail(throttle, "late@x.com", 10);

        Assert.Null(throttle.GetRetryAfter("late@x.com"));
    }
}
