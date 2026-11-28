using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.Hosting;

// Per-client-IP limits on the unauthenticated login and signup endpoints.
// Configured in the "RateLimiting" section; the defaults apply when it is absent.
// Validated at startup: a bad value stops the app instead of silently disabling a limit.
public class RateLimitOptions
{
    public const string SectionName = "RateLimiting";

    [Range(1, 10_000)]
    public int LoginPermitLimit { get; set; } = 10;

    [Range(1, 86_400)]
    public int LoginWindowSeconds { get; set; } = 60;

    [Range(1, 10_000)]
    public int SignupPermitLimit { get; set; } = 5;

    [Range(1, 86_400)]
    public int SignupWindowSeconds { get; set; } = 3600;
}

// Per-account backoff for failed logins, on top of the per-IP limit. Section "LoginThrottle".
public class LoginThrottleOptions
{
    public const string SectionName = "LoginThrottle";

    // Failures within the window that trigger the backoff.
    [Range(1, 1_000)]
    public int MaxFailures { get; set; } = 5;

    [Range(1, 1_440)]
    public int WindowMinutes { get; set; } = 15;

    // How long the account's logins are refused after reaching MaxFailures (never permanent).
    [Range(1, 3_600)]
    public int BackoffSeconds { get; set; } = 60;

    // Upper bound on tracked emails, so memory stays bounded under a flood of random addresses.
    [Range(100, 1_000_000)]
    public int MaxTrackedAccounts { get; set; } = 10_000;
}
