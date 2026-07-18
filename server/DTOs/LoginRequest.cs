namespace SeedsBank.Server.DTOs;

public class LoginRequest
{
    public string? UserName { get; set; }
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
}
