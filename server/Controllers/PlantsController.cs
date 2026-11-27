using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Authorize]
[Route("projects/{userId}/{projectId}/plants")]
public class PlantsController : OwnedResourceControllerBase
{
    private readonly IPlantService _plantService;

    public PlantsController(IPlantService plantService, IProjectsService projectsService) : base(projectsService)
    {
        _plantService = plantService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPlants(string userId, string projectId, [FromQuery] PlantListQuery query)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () => Ok(await _plantService.GetPlantsAsync(projectId, query)));
    }

    [HttpGet("counts")]
    public async Task<IActionResult> GetCounts(string userId, string projectId, [FromQuery] PlantCountsQuery query)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () => Ok(await _plantService.GetCountsAsync(projectId, query)));
    }

    [HttpGet("preview")]
    public async Task<IActionResult> Preview(string userId, string projectId, [FromQuery] PlacementPreviewQuery query)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () => Ok(await _plantService.PreviewAsync(projectId, query)));
    }

    [HttpGet("{plantId}")]
    public async Task<IActionResult> GetPlant(string userId, string projectId, string plantId)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;

        var plant = await _plantService.GetPlantAsync(projectId, plantId);
        return plant is null ? NotFound() : Ok(plant);
    }

    [HttpPost]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> CreatePlants(string userId, string projectId, CreatePlantsRequest request)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
            StatusCode(StatusCodes.Status201Created, await _plantService.CreateAsync(projectId, request)));
    }

    [HttpPut("{plantId}")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> UpdateTraits(string userId, string projectId, string plantId, UpdatePlantRequest request)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
        {
            var plant = await _plantService.UpdateTraitsAsync(projectId, plantId, request);
            return plant is null ? NotFound() : Ok(plant);
        });
    }

    [HttpPut("{plantId}/parents")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> UpdateParents(string userId, string projectId, string plantId, UpdateParentsRequest request)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
        {
            var result = await _plantService.UpdateParentsAsync(projectId, plantId, request);
            return result is null ? NotFound() : Ok(result);
        });
    }

    [HttpDelete("{plantId}")]
    public async Task<IActionResult> DeletePlant(string userId, string projectId, string plantId, [FromQuery] bool confirm = false)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;

        var result = await _plantService.DeleteAsync(projectId, plantId, confirm);
        return result.Status switch
        {
            DeletePlantStatus.Deleted => Ok(new DeletePlantResponse { ChildrenAffected = result.ChildCount }),
            DeletePlantStatus.HasChildren => Conflict(new
            {
                message = "This plant is a parent of other plants. Confirm to delete it anyway.",
                field = (string?)null,
                code = "has_children",
                childCount = result.ChildCount,
            }),
            _ => NotFound(),
        };
    }
}
