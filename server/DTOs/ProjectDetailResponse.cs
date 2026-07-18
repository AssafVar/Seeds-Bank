namespace SeedsBank.Server.DTOs;

public class ProjectDetailResponse
{
    public ProjectHeaderDto? ProjectHeaders { get; set; }
    public List<ProjectItemDto> ProjectDetails { get; set; } = new();
}
