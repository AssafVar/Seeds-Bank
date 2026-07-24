using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Route("vegetable-varieties")]
public class VegetableVarietiesController : ControllerBase
{
    private readonly IVegetableVarietyService _varietyService;

    public VegetableVarietiesController(IVegetableVarietyService varietyService)
    {
        _varietyService = varietyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var varieties = await _varietyService.GetAllAsync();
        return Ok(varieties);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create(VegetableVarietyRequest request)
    {
        var variety = await _varietyService.CreateAsync(request);
        return Ok(variety);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, VegetableVarietyRequest request)
    {
        var updated = await _varietyService.UpdateAsync(id, request);
        return updated ? Ok() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _varietyService.DeleteAsync(id);
        return deleted ? Ok() : NotFound();
    }
}
