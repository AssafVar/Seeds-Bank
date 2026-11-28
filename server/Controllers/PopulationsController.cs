using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{userId}/{projectId}/populations")]
public class PopulationsController : OwnedResourceControllerBase
{
    private readonly ILineService _lineService;

    public PopulationsController(ILineService lineService, IProjectsService projectsService) : base(projectsService)
    {
        _lineService = lineService;
    }

    [HttpPost]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> CreatePopulation(string userId, string projectId, CreatePopulationRequest request)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
            StatusCode(StatusCodes.Status201Created, await _lineService.CreatePopulationAsync(projectId, request)));
    }

    [HttpDelete("{populationId}")]
    public async Task<IActionResult> DeletePopulation(string userId, string projectId, int populationId)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
            await _lineService.DeletePopulationAsync(projectId, populationId) ? NoContent() : NotFound());
    }
}
