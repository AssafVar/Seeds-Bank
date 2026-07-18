namespace SeedsBank.Server.DTOs;

public class CreateProjectRequest
{
    public string ProjectId { get; set; } = null!;
    public string ProjectName { get; set; } = null!;
    public string PlantType { get; set; } = null!;
}
