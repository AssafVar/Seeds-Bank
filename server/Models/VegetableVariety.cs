using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("vegetable_varieties")]
public class VegetableVariety
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = null!;

    [Column("plant_spacing")]
    public double PlantSpacing { get; set; }

    [Column("row_spacing")]
    public double RowSpacing { get; set; }

    [Column("water_mm_per_season")]
    public double WaterMmPerSeason { get; set; }

    [Column("fertilizer_kg_per_100m2")]
    public double FertilizerKgPer100m2 { get; set; }

    [Column("seed_buffer_percent")]
    public double SeedBufferPercent { get; set; }

    [Column("seed_unit")]
    public string SeedUnit { get; set; } = "seeds";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
