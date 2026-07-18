using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

public class SignupRequest
{
    [Required]
    public string UserId { get; set; } = null!;

    public string? UserName { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = null!;
}
