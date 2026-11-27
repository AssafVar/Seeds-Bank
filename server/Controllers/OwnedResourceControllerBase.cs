using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Controllers;

// Shared by controllers whose routes are scoped to a {userId} segment
// (projects, fields, ...): verifies the caller's JWT identity matches the
// route's userId before any resource lookup happens.
//
// There is deliberately no admin bypass here: an admin token with another
// user's id gets 403 like anyone else.
public abstract class OwnedResourceControllerBase : ControllerBase
{
    private readonly IProjectsService? _projectsService;

    protected OwnedResourceControllerBase()
    {
    }

    // Controllers that also scope by {projectId} pass the projects service so
    // every action can start with RejectUnlessOwnedProjectAsync.
    protected OwnedResourceControllerBase(IProjectsService projectsService)
    {
        _projectsService = projectsService;
    }

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

    // The single ownership gate for {userId}/{projectId} routes: 403 when the
    // route user is not the caller, then 404 (same body as a project that
    // does not exist) when the project is not the caller's. Returns null when
    // the caller may proceed. Start every action with it.
    protected async Task<IActionResult?> RejectUnlessOwnedProjectAsync(string userId, string projectId)
    {
        if (_projectsService is null)
        {
            throw new InvalidOperationException("This controller was not given an IProjectsService.");
        }

        if (!IsCallerOwner(userId, out var forbidden)) return forbidden;
        return await _projectsService.IsProjectOwnedAsync(userId, projectId) ? null : NotFound();
    }

    // Runs an action body and turns a PedigreeException into its
    // { message, field, code } answer. Nothing else is caught here.
    protected async Task<IActionResult> GuardedAsync(Func<Task<IActionResult>> body)
    {
        try
        {
            return await body();
        }
        catch (PedigreeException ex)
        {
            return PedigreeError(ex);
        }
    }

    // Pedigree rule violations: { message, field, code } with the exception's
    // status (400, or 409 for conflicts). Nothing else leaves the server.
    protected IActionResult PedigreeError(PedigreeException ex) =>
        StatusCode(ex.StatusCode, new { message = ex.Message, field = ex.Field, code = ex.Code });
}
