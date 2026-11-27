using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

// Lines and populations of one project. Every method takes the project id
// and scopes every query by it; the controller has already proved the caller
// owns the project. A null or false result means "not found in this
// project"; rule violations throw PedigreeException.
public interface ILineService
{
    Task<List<LineDto>> GetOverviewAsync(string projectId);
    Task<LineDto?> GetLineAsync(string projectId, int lineId);
    Task<LineDto> CreateLineAsync(string projectId, CreateLineRequest request);
    Task<RenameLineResponse?> RenameLineAsync(string projectId, int lineId, RenameLineRequest request);
    Task<LineDto?> SetStableAsync(string projectId, int lineId, bool isStable);
    Task<bool> DeleteLineAsync(string projectId, int lineId);
    Task<PopulationDto> CreatePopulationAsync(string projectId, CreatePopulationRequest request);
    Task<bool> DeletePopulationAsync(string projectId, int populationId);
}
