namespace SeedsBank.Server.DTOs;

public class FieldDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Variety { get; set; }
    public string ShapeType { get; set; } = null!;
    public string SowingStructure { get; set; } = null!;
    public List<VertexDto> Vertices { get; set; } = new();
    public double? LandWidth { get; set; }
    public double? LandLength { get; set; }

    // Null means this is a large-field boundary/container - it has no
    // planting data of its own, only its sub-fields do.
    public double? PlantSpacing { get; set; }
    public double? RowSpacing { get; set; }
    public double Area { get; set; }
    public int? PlantsPerRow { get; set; }
    public int? NumberOfRows { get; set; }
    public int TotalCapacity { get; set; }
    public List<VertexDto>? PlantPositions { get; set; }
    public bool IsPreviewApproximate { get; set; }

    public int? ParentFieldId { get; set; }
    public List<GeoVertexDto>? GeoVertices { get; set; }

    public DateTime CreatedAt { get; set; }

    // Defaults to "planning" (see FieldService.ToDto) when unset.
    public string Status { get; set; } = "planning";
    public DateTime? SowingDate { get; set; }
    public DateTime? HarvestDate { get; set; }
    public double? YieldAmount { get; set; }
    public string? YieldUnit { get; set; }
    public string? Notes { get; set; }
}
