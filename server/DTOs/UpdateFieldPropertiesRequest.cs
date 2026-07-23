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

    // "planning" / "sown" / "growing" / "harvested" - validated in
    // FieldService, falls back to "planning" for anything else.
    public string? Status { get; set; }
    public DateTime? SowingDate { get; set; }
    public DateTime? HarvestDate { get; set; }
    public double? YieldAmount { get; set; }
    public string? YieldUnit { get; set; }
    public string? Notes { get; set; }
}
