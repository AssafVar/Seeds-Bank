using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Route("news")]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService)
    {
        _newsService = newsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var posts = await _newsService.GetAllAsync();
        return Ok(posts);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create(NewsPostRequest request)
    {
        var post = await _newsService.CreateAsync(request);
        return Ok(post);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, NewsPostRequest request)
    {
        var updated = await _newsService.UpdateAsync(id, request);
        return updated ? Ok() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _newsService.DeleteAsync(id);
        return deleted ? Ok() : NotFound();
    }
}
