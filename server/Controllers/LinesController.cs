using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Authorize]
[Route("projects/{userId}/{projectId}/lines")]
public class LinesController : OwnedResourceControllerBase
{
    private readonly ILineService _lineService;

    public LinesController(ILineService lineService, IProjectsService projectsService) : base(projectsService)
    {
        _lineService = lineService;
    }

    [HttpPost]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> CreateLine(string userId, string projectId, CreateLineRequest request)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
            StatusCode(StatusCodes.Status201Created, await _lineService.CreateLineAsync(projectId, request)));
    }

    [HttpPost("{lineId}/rename")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> RenameLine(string userId, string projectId, int lineId, RenameLineRequest request)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
        {
            var result = await _lineService.RenameLineAsync(projectId, lineId, request);
            return result is null ? NotFound() : StatusCode(StatusCodes.Status201Created, result);
        });
    }

    [HttpPut("{lineId}/stable")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> SetStable(string userId, string projectId, int lineId, SetStableRequest request)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
        {
            var line = await _lineService.SetStableAsync(projectId, lineId, request.IsStable);
            return line is null ? NotFound() : Ok(line);
        });
    }

    [HttpDelete("{lineId}")]
    public async Task<IActionResult> DeleteLine(string userId, string projectId, int lineId)
    {
        if (await RejectUnlessOwnedProjectAsync(userId, projectId) is { } rejected) return rejected;
        return await GuardedAsync(async () =>
            await _lineService.DeleteLineAsync(projectId, lineId) ? NoContent() : NotFound());
    }
}
