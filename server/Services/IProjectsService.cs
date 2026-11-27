using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IProjectsService
{
    Task<ProjectOverviewResponse?> GetProjectAsync(string userId, string projectId);
    Task<List<ProjectHeaderDto>> GetUserProjectsAsync(string userId);
    Task CreateProjectAsync(string userId, CreateProjectRequest request);
    Task<bool> IsProjectOwnedAsync(string userId, string projectId);
}
