namespace SeedsBank.Server.DTOs;

// GET projects/{userId}/{projectId}: the header and every line with its
// populations, counts, origin and stability. No plants (they are paged).
public class ProjectOverviewResponse
{
    public ProjectHeaderDto? ProjectHeaders { get; set; }
    public List<LineDto> Lines { get; set; } = new();
}
