using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("fields")]
public class Field
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("project_id")]
    public string ProjectId { get; set; } = null!;

    [Column("name")]
    public string Name { get; set; } = null!;

    // The vegetable variety picked in the Add Field form, if any ("Custom"
    // spacing entries leave this null). Powers the per-project Varieties
    // view, which groups fields by this value.
    [Column("variety")]
    public string? Variety { get; set; }

    [Column("shape_type")]
    public string ShapeType { get; set; } = "rectangle";

    // "grid" (rows aligned) or "staggered" (odd rows offset by half the
    // plant spacing, a denser triangular arrangement). Feeds the same
    // PolygonMath.ComputePlantPositions path as everything else.
    [Column("sowing_structure")]
    public string SowingStructure { get; set; } = "grid";

    // JSON-serialized List<VertexDto>, in meters. Always populated: for
    // rectangle-mode fields this is the auto-derived 4-corner outline, so
    // capacity math has a single code path for every shape (see
    // PolygonMath/FieldService).
    [Column("vertices_json")]
    public string VerticesJson { get; set; } = null!;

    [Column("land_width")]
    public double? LandWidth { get; set; }

    [Column("land_length")]
    public double? LandLength { get; set; }

    [Column("plant_spacing")]
    public double PlantSpacing { get; set; }

    [Column("row_spacing")]
    public double RowSpacing { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
