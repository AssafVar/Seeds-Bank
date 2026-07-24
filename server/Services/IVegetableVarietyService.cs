using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IVegetableVarietyService
{
    Task<List<VegetableVarietyDto>> GetAllAsync();
    Task<VegetableVarietyDto> CreateAsync(VegetableVarietyRequest request);
    Task<bool> UpdateAsync(int id, VegetableVarietyRequest request);
    Task<bool> DeleteAsync(int id);
}
