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
        await _authService.SignupAsync(request);
        return Ok("Successfully signed");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest("email or password missing");
        }

        var result = await _authService.LoginAsync(request);
        if (result is null)
        {
            return Unauthorized("Wrong username or password!, please try again.");
        }

        return Ok(result);
    }
}
