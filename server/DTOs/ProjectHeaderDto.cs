using System.Text.Json.Serialization;

namespace SeedsBank.Server.DTOs;

public class ProjectHeaderDto
{
    [JsonPropertyName("project_name")]
    public string ProjectName { get; set; } = null!;

    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = null!;

    [JsonPropertyName("project_id")]
    public string ProjectId { get; set; } = null!;

    [JsonPropertyName("plant_type")]
    public string PlantType { get; set; } = null!;

    [JsonPropertyName("start_date")]
    public string StartDate { get; set; } = null!;

    [JsonPropertyName("last_update")]
    public string LastUpdate { get; set; } = null!;
}
