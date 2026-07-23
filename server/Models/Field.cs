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

    // Self-reference: null for a standalone field or a top-level "large
    // field" boundary; set for a sub-field carved out of a large field.
    // Only one level deep - a sub-field's own ParentFieldId is never set on
    // a field that already has one (enforced in FieldService, not here).
    [Column("parent_field_id")]
    public int? ParentFieldId { get; set; }

    public Field? Parent { get; set; }
    public ICollection<Field> Children { get; set; } = new List<Field>();

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

    // Null on a large-field container (no planting data of its own - only
    // its sub-fields get sown). Required (>0) for every other field, see
    // FieldService validation.
    [Column("plant_spacing")]
    public double? PlantSpacing { get; set; }

    [Column("row_spacing")]
    public double? RowSpacing { get; set; }

    // Raw GPS boundary as drawn on the map, JSON-serialized List<GeoVertexDto>.
    // Only populated for map-drawn fields (large fields and their sub-fields);
    // null for the legacy local-canvas rectangle/polygon flow.
    [Column("geo_vertices_json")]
    public string? GeoVerticesJson { get; set; }

    // Projection anchor shared by a large field and all of its sub-fields,
    // so their local-meter VerticesJson (used by PolygonMath) live in the
    // same coordinate space. Only set on a large field (ParentFieldId == null
    // with a GeoVerticesJson); sub-fields project through the parent's origin
    // instead of storing their own.
    [Column("origin_lat")]
    public double? OriginLat { get; set; }

    [Column("origin_lng")]
    public double? OriginLng { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    // Lifecycle stage set explicitly by the grower - "planning" / "sown" /
    // "growing" / "harvested" - never inferred from the dates below.
    // Null (unset) is treated as "planning" (see FieldService.ToDto).
    [Column("status")]
    public string? Status { get; set; }

    [Column("sowing_date")]
    public DateTime? SowingDate { get; set; }

    [Column("harvest_date")]
    public DateTime? HarvestDate { get; set; }

    [Column("yield_amount")]
    public double? YieldAmount { get; set; }

    // Free text (e.g. "kg", "crates") rather than an enum - yield units
    // vary too much by crop/grower to usefully constrain.
    [Column("yield_unit")]
    public string? YieldUnit { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }
}
