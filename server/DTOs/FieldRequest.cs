using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

public class FieldRequest
{
    [Required]
    public string Name { get; set; } = null!;

    public string? Variety { get; set; }

    // "rectangle" or "polygon". Rectangle requires LandWidth/LandLength;
    // polygon requires Vertices (>= 3 points) - validated in FieldService
    // since the requirement is conditional on this value.
    [Required]
    public string ShapeType { get; set; } = "rectangle";

    public double? LandWidth { get; set; }
    public double? LandLength { get; set; }
    public List<VertexDto>? Vertices { get; set; }

    // "grid" or "staggered" - validated in FieldService.
    public string SowingStructure { get; set; } = "grid";

    [Range(0.01, double.MaxValue)]
    public double PlantSpacing { get; set; }

    [Range(0.01, double.MaxValue)]
    public double RowSpacing { get; set; }
}
