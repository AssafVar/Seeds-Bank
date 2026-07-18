namespace SeedsBank.Server.DTOs;

public class FieldDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public double LandWidth { get; set; }
    public double LandLength { get; set; }
    public double PlantSpacing { get; set; }
    public double RowSpacing { get; set; }
    public int PlantsPerRow { get; set; }
    public int NumberOfRows { get; set; }
    public int TotalCapacity { get; set; }
    public DateTime CreatedAt { get; set; }
}
