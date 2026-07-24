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
    private readonly IFieldWorkLogService _fieldWorkLogService;

    public FieldsController(IFieldService fieldService, IFieldWorkLogService fieldWorkLogService)
    {
        _fieldService = fieldService;
        _fieldWorkLogService = fieldWorkLogService;
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

    [HttpPut("{fieldId}/geometry")]
    public async Task<IActionResult> UpdateFieldGeometry(string userId, string projectId, int fieldId, UpdateFieldGeometryRequest request)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        try
        {
            var field = await _fieldService.UpdateGeometryAsync(projectId, fieldId, request);
            return field is null ? NotFound() : Ok(field);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{fieldId}/properties")]
    public async Task<IActionResult> UpdateFieldProperties(string userId, string projectId, int fieldId, UpdateFieldPropertiesRequest request)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        try
        {
            var field = await _fieldService.UpdatePropertiesAsync(projectId, fieldId, request);
            return field is null ? NotFound() : Ok(field);
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

    [HttpGet("{fieldId}/work-logs")]
    public async Task<IActionResult> GetWorkLogs(string userId, string projectId, int fieldId)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var logs = await _fieldWorkLogService.GetByFieldAsync(projectId, fieldId);
        return Ok(logs);
    }

    [HttpPost("{fieldId}/work-logs")]
    public async Task<IActionResult> CreateWorkLog(string userId, string projectId, int fieldId, FieldWorkLogRequest request)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        try
        {
            var log = await _fieldWorkLogService.CreateAsync(projectId, fieldId, request);
            return log is null ? NotFound() : Ok(log);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{fieldId}/work-logs/{logId}")]
    public async Task<IActionResult> DeleteWorkLog(string userId, string projectId, int fieldId, int logId)
    {
        if (!IsCallerOwner(userId, out var forbidden)) return forbidden!;

        var deleted = await _fieldWorkLogService.DeleteAsync(projectId, fieldId, logId);
        return deleted ? Ok() : NotFound();
    }
}
