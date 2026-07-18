using System.Text.Json.Serialization;

namespace SeedsBank.Server.DTOs;

public class ProjectItemDto
{
    [JsonPropertyName("line")]
    public string Line { get; set; } = null!;

    [JsonPropertyName("project_name")]
    public string ProjectName { get; set; } = null!;

    [JsonPropertyName("project_id")]
    public string ProjectId { get; set; } = null!;

    [JsonPropertyName("plant_id")]
    public string PlantId { get; set; } = null!;

    [JsonPropertyName("plant_father_id")]
    public string PlantFatherId { get; set; } = null!;

    [JsonPropertyName("plant_mother_id")]
    public string PlantMotherId { get; set; } = null!;

    [JsonPropertyName("fruit_color")]
    public string FruitColor { get; set; } = null!;

    [JsonPropertyName("fruit_weight")]
    public string FruitWeight { get; set; } = null!;

    [JsonPropertyName("seed_color")]
    public string SeedColor { get; set; } = null!;

    [JsonPropertyName("seed_weight")]
    public string SeedWeight { get; set; } = null!;

    [JsonPropertyName("generation")]
    public int Generation { get; set; }
}
