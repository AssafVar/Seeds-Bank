using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IFieldService
{
    Task<List<FieldDto>> GetByProjectAsync(string projectId);
    Task<FieldDto> CreateAsync(string projectId, FieldRequest request);
    Task<FieldDto?> UpdateGeometryAsync(string projectId, int fieldId, List<GeoVertexDto> geoVertices);
    Task<bool> DeleteAsync(string projectId, int fieldId);
}
