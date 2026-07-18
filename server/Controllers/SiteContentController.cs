using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Route("site-content")]
public class SiteContentController : ControllerBase
{
    private readonly ISiteContentService _siteContentService;

    public SiteContentController(ISiteContentService siteContentService)
    {
        _siteContentService = siteContentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetSiteContent()
    {
        var content = await _siteContentService.GetSiteContentAsync();
        return Ok(content);
    }

    [HttpPut]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateSiteContent(UpdateSiteContentRequest request)
    {
        await _siteContentService.UpdateSiteContentAsync(request);
        return Ok();
    }

    [HttpPost("gallery")]
    [Authorize(Policy = "AdminOnly")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AddGalleryImage([FromForm] UploadGalleryImageRequest request)
    {
        try
        {
            var image = await _siteContentService.AddGalleryImageAsync(request.File, request.Caption);
            return Ok(image);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("gallery/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteGalleryImage(int id)
    {
        var deleted = await _siteContentService.DeleteGalleryImageAsync(id);
        return deleted ? Ok() : NotFound();
    }
}
