using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Controllers;

[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    private readonly IAuthService _authService;

    public UsersController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("signup")]
    public async Task<IActionResult> Signup(SignupRequest request)
    {
        var created = await _authService.SignupAsync(request);
        if (!created)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        return Ok("Successfully signed");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result is null)
        {
            return Unauthorized("Wrong username or password!, please try again.");
        }

        return Ok(result);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue("userId");
        if (userId is null)
        {
            return Unauthorized();
        }

        var updated = await _authService.UpdateProfileAsync(userId, request.UserName);
        return updated ? Ok(new { userName = request.UserName }) : NotFound();
    }
}
