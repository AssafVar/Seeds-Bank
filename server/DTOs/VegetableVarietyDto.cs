namespace SeedsBank.Server.DTOs;

public class VegetableVarietyDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public double PlantSpacing { get; set; }
    public double RowSpacing { get; set; }
    public double WaterMmPerSeason { get; set; }
    public double FertilizerKgPer100m2 { get; set; }
    public double SeedBufferPercent { get; set; }
    public string SeedUnit { get; set; } = "seeds";
    public DateTime CreatedAt { get; set; }
}
