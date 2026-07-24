using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IFieldWorkLogService
{
    Task<List<FieldWorkLogDto>> GetByFieldAsync(string projectId, int fieldId);
    Task<FieldWorkLogDto?> CreateAsync(string projectId, int fieldId, FieldWorkLogRequest request);
    Task<bool> DeleteAsync(string projectId, int fieldId, int logId);
}
