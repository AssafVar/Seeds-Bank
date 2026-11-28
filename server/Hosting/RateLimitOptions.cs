namespace SeedsBank.Server.Hosting;

// Per-client-IP limits on the unauthenticated login and signup endpoints.
// Configured in the "RateLimiting" section; the defaults apply when it is absent.
public class RateLimitOptions
{
    public const string SectionName = "RateLimiting";

    public int LoginPermitLimit { get; set; } = 10;
    public int LoginWindowSeconds { get; set; } = 60;
    public int SignupPermitLimit { get; set; } = 5;
    public int SignupWindowSeconds { get; set; } = 3600;
}
