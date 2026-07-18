using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

public class LoginRequest
{
    public string? UserName { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;
}
