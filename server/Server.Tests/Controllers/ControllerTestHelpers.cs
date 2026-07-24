using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace SeedsBank.Server.Tests.Controllers;

// [Authorize]/[Authorize(Policy = ...)] attributes are enforced by the ASP.NET
// pipeline, not by calling a controller action directly - out of scope here
// (would need a WebApplicationFactory integration test). These helpers only
// stand in for the ClaimsPrincipal a controller reads from User.* once a
// request has already been authenticated/authorized.
public static class ControllerTestHelpers
{
    public static void SetUser(ControllerBase controller, string userId)
    {
        var identity = new ClaimsIdentity(new[] { new Claim("userId", userId) }, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
        };
    }
}
