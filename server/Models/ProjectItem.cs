using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

// A plant. The table keeps its legacy name; a plant's line is its
// population's line (no second source of truth on the plant).
[Table("project_items")]
public class ProjectItem
{
    [Key]
    [Column("plant_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [MaxLength(255)]
    public string PlantId { get; set; } = null!;

    [Column("project_id")]
    [MaxLength(255)]
    public string ProjectId { get; set; } = null!;

    // Assigned when the plant is created and never changed. Unique per
    // project, case-insensitive (the column is citext).
    [Column("tag")]
    [MaxLength(40)]
    public string Tag { get; set; } = null!;

    [Column("population_id")]
    public int PopulationId { get; set; }

    public Population Population { get; set; } = null!;

    [Column("plant_mother_id")]
    [MaxLength(255)]
    public string? MotherPlantId { get; set; }

    [Column("plant_father_id")]
    [MaxLength(255)]
    public string? FatherPlantId { get; set; }

    // Set when a parent was deleted: the deleted plant's tag ("(unknown)" for
    // a dangling legacy reference).
    [Column("mother_removed_tag")]
    [MaxLength(40)]
    public string? MotherRemovedTag { get; set; }

    [Column("father_removed_tag")]
    [MaxLength(40)]
    public string? FatherRemovedTag { get; set; }

    [Column("fruit_color")]
    public string? FruitColor { get; set; }

    [Column("fruit_weight")]
    public string? FruitWeight { get; set; }

    [Column("seed_color")]
    public string? SeedColor { get; set; }

    [Column("seed_weight")]
    public string? SeedWeight { get; set; }

    // Optimistic concurrency: +1 on every update, including parent edits.
    [Column("row_version")]
    public int RowVersion { get; set; } = 1;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
