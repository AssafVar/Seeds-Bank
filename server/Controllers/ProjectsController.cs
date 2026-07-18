using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Authorize]
[Route("projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectsService _projectsService;

    public ProjectsController(IProjectsService projectsService)
    {
        _projectsService = projectsService;
    }

    [HttpGet("{userId}/{projectId}")]
    public async Task<IActionResult> GetProject(string userId, string projectId)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var result = await _projectsService.GetProjectAsync(userId, projectId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{userId}/{projectId}")]
    public async Task<IActionResult> UpdateProject(string userId, string projectId, [FromBody] List<ProjectItemDto> projectDetails)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var updated = await _projectsService.UpdateProjectDetailsAsync(userId, projectId, projectDetails);
        return updated
            ? Ok(new { message = "Database updated successfully" })
            : NotFound(new { message = "Project not found" });
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

        await _projectsService.CreateProjectAsync(userId, request);
        return Ok();
    }

    [HttpDelete("{userId}/{projectId}/{plantId}")]
    public async Task<IActionResult> DeletePlant(string userId, string projectId, string plantId)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var deleted = await _projectsService.DeletePlantAsync(userId, projectId, plantId);
        return deleted
            ? Ok("Database updated successfully")
            : NotFound(new { message = "Plant not found" });
    }

    private bool IsCallerOwner(string routeUserId, out IActionResult? forbidden)
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
