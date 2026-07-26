using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

public class RenameFieldRequest
{
    [Required]
    public string Name { get; set; } = null!;
}
