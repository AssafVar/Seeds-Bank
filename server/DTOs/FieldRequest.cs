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

    // Set to carve this field out as a sub-field of an existing large
    // field. Null means either a standalone field or a new large-field
    // boundary itself - see FieldService.CreateAsync.
    public int? ParentFieldId { get; set; }

    // Real-world GPS boundary drawn on the map (>= 3 points). Present for
    // large fields and their sub-fields; absent for the legacy local-canvas
    // rectangle/polygon flow.
    public List<GeoVertexDto>? GeoVertices { get; set; }

    // "grid" or "staggered" - validated in FieldService.
    public string SowingStructure { get; set; } = "grid";

    // Required (>0) for every field except a large-field boundary, which
    // carries no planting data of its own - validated in FieldService since
    // the requirement is conditional on ParentFieldId/GeoVertices.
    public double? PlantSpacing { get; set; }
    public double? RowSpacing { get; set; }
}
