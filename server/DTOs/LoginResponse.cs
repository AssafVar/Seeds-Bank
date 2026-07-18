namespace SeedsBank.Server.DTOs;

public class LoginResponse
{
    public string UserId { get; set; } = null!;
    public string? UserName { get; set; }
    public string Email { get; set; } = null!;
    public string Token { get; set; } = null!;
    public bool IsAdmin { get; set; }
}
