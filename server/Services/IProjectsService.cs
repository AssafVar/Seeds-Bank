using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IProjectsService
{
    Task<ProjectDetailResponse?> GetProjectAsync(string userId, string projectId);
    Task<List<ProjectHeaderDto>> GetUserProjectsAsync(string userId);
    Task CreateProjectAsync(string userId, CreateProjectRequest request);
    Task<bool> UpdateProjectDetailsAsync(string userId, string projectId, List<ProjectItemDto> items);
    Task<bool> DeletePlantAsync(string userId, string projectId, string plantId);
}
