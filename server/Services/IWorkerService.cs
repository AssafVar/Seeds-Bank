using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IWorkerService
{
    Task<List<WorkerDto>> GetAllAsync();
    Task<WorkerDto> CreateAsync(WorkerRequest request);
    Task<bool> UpdateAsync(int id, WorkerRequest request);
    Task<bool> DeleteAsync(int id);
}
