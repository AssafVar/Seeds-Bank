using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("project_items")]
public class ProjectItem
{
    [Key]
    [Column("plant_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public string PlantId { get; set; } = null!;

    [Column("project_id")]
    public string ProjectId { get; set; } = null!;

    [Column("project_name")]
    public string ProjectName { get; set; } = null!;

    [Column("line")]
    public string Line { get; set; } = null!;

    [Column("plant_father_id")]
    public string PlantFatherId { get; set; } = null!;

    [Column("plant_mother_id")]
    public string PlantMotherId { get; set; } = null!;

    [Column("fruit_color")]
    public string FruitColor { get; set; } = null!;

    [Column("fruit_weight")]
    public string FruitWeight { get; set; } = null!;

    [Column("seed_color")]
    public string SeedColor { get; set; } = null!;

    [Column("seed_weight")]
    public string SeedWeight { get; set; } = null!;

    [Column("generation")]
    public int Generation { get; set; }
}
