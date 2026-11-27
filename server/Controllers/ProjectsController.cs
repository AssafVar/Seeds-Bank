using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Authorize]
[Route("projects")]
public class ProjectsController : OwnedResourceControllerBase
{
    private readonly IProjectsService _projectsService;

    public ProjectsController(IProjectsService projectsService) : base(projectsService)
    {
        _projectsService = projectsService;
    }

    [HttpGet("{userId}/{projectId}")]
    public async Task<IActionResult> GetProject(string userId, string projectId)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;

        var result = await _projectsService.GetProjectAsync(userId, projectId);
        return result is null ? NotFound() : Ok(result);
    }

    // The old whole-list save. Gone: a stale client must reload. It binds no
    // body and writes nothing, but is still authorized like every other route.
    [HttpPost("{userId}/{projectId}")]
    public async Task<IActionResult> LegacySave(string userId, string projectId)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;

        return StatusCode(StatusCodes.Status410Gone, new { message = "This page is out of date. Reload and try again." });
    }

    [HttpGet("{userId}")]
    public async Task<IActionResult> GetUserProjectList(string userId)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var results = await _projectsService.GetUserProjectsAsync(userId);
        return Ok(results);
    }

    [HttpPost("{userId}")]
    public async Task<IActionResult> CreateNewProject(string userId, CreateProjectRequest request)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        return await GuardedAsync(async () =>
        {
            await _projectsService.CreateProjectAsync(userId, request);
            return Ok();
        });
    }
}
