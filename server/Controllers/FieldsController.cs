using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Authorize]
[Route("projects/{userId}/{projectId}/fields")]
public class FieldsController : OwnedResourceControllerBase
{
    private readonly IFieldService _fieldService;

    public FieldsController(IFieldService fieldService)
    {
        _fieldService = fieldService;
    }

    [HttpGet]
    public async Task<IActionResult> GetFields(string userId, string projectId)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var fields = await _fieldService.GetByProjectAsync(projectId);
        return Ok(fields);
    }

    [HttpPost]
    public async Task<IActionResult> CreateField(string userId, string projectId, FieldRequest request)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        try
        {
            var field = await _fieldService.CreateAsync(projectId, request);
            return Ok(field);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{fieldId}")]
    public async Task<IActionResult> DeleteField(string userId, string projectId, int fieldId)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var deleted = await _fieldService.DeleteAsync(projectId, fieldId);
        return deleted ? Ok() : NotFound();
    }
}
