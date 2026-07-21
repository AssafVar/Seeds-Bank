using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

public class UpdateFieldPropertiesRequest
{
    [Required]
    public string Name { get; set; } = null!;

    public string? Variety { get; set; }

    // "grid" or "staggered" - validated in FieldService.
    public string SowingStructure { get; set; } = "grid";

    public double? PlantSpacing { get; set; }
    public double? RowSpacing { get; set; }
}
