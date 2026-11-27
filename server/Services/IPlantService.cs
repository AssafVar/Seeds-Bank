using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public enum DeletePlantStatus
{
    NotFound,
    Deleted,
    HasChildren,
}

// ChildCount is the number of children when the plant has some (the 409
// answer), or the number whose parent link was cleared (the 200 answer).
public sealed record DeletePlantResult(DeletePlantStatus Status, int ChildCount);

// Plants of one project. Every method takes the project id and scopes every
// query by it (plant ids are a global key, so they are never looked up
// alone); the controller has already proved the caller owns the project. A
// null result means "not found in this project"; rule violations throw
// PedigreeException.
public interface IPlantService
{
    Task<PagedResultDto<PlantDto>> GetPlantsAsync(string projectId, PlantListQuery query);
    Task<PlantCountsDto> GetCountsAsync(string projectId, PlantCountsQuery query);
    Task<PlantDto?> GetPlantAsync(string projectId, string plantId);
    Task<PlacementPreviewDto> PreviewAsync(string projectId, PlacementPreviewQuery query);
    Task<CreatePlantsResponse> CreateAsync(string projectId, CreatePlantsRequest request);
    Task<PlantDto?> UpdateTraitsAsync(string projectId, string plantId, UpdatePlantRequest request);
    Task<UpdateParentsResponse?> UpdateParentsAsync(string projectId, string plantId, UpdateParentsRequest request);
    Task<DeletePlantResult> DeleteAsync(string projectId, string plantId, bool confirm);
}
