using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace SeedsBank.Server.Controllers;

// Shared by controllers whose routes are scoped to a {userId} segment
// (projects, fields, ...): verifies the caller's JWT identity matches the
// route's userId before any resource lookup happens.
public abstract class OwnedResourceControllerBase : ControllerBase
{
    protected bool IsCallerOwner(string routeUserId, out IActionResult? forbidden)
    {
        var callerUserId = User.FindFirstValue("userId");
        if (callerUserId == routeUserId)
        {
            forbidden = null;
            return true;
        }

        forbidden = Forbid();
        return false;
    }
}
