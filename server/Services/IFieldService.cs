using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IFieldService
{
    Task<PagedResultDto<FieldDto>> GetByProjectAsync(string projectId, int page, int pageSize);
    Task<FieldDto> CreateAsync(string projectId, FieldRequest request);
    Task<FieldDto?> RenameAsync(string projectId, int fieldId, string name);
    Task<FieldDto?> UpdateGeometryAsync(string projectId, int fieldId, UpdateFieldGeometryRequest request);
    Task<FieldDto?> UpdatePropertiesAsync(string projectId, int fieldId, UpdateFieldPropertiesRequest request);
    Task<bool> DeleteAsync(string projectId, int fieldId);
}
