using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class VegetableVarietyService : IVegetableVarietyService
{
    private readonly AppDbContext _db;

    public VegetableVarietyService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<VegetableVarietyDto>> GetAllAsync()
    {
        var varieties = await _db.VegetableVarieties.AsNoTracking()
            .OrderBy(v => v.Name)
            .ToListAsync();

        return varieties.Select(ToDto).ToList();
    }

    public async Task<VegetableVarietyDto> CreateAsync(VegetableVarietyRequest request)
    {
        var variety = new VegetableVariety
        {
            Name = request.Name,
            PlantSpacing = request.PlantSpacing,
            RowSpacing = request.RowSpacing,
            WaterMmPerSeason = request.WaterMmPerSeason,
            FertilizerKgPer100m2 = request.FertilizerKgPer100m2,
            SeedBufferPercent = request.SeedBufferPercent,
            SeedUnit = request.SeedUnit,
            CreatedAt = DateTime.UtcNow,
        };

        _db.VegetableVarieties.Add(variety);
        await _db.SaveChangesAsync();

        return ToDto(variety);
    }

    public async Task<bool> UpdateAsync(int id, VegetableVarietyRequest request)
    {
        var variety = await _db.VegetableVarieties.FirstOrDefaultAsync(v => v.Id == id);
        if (variety is null)
        {
            return false;
        }

        variety.Name = request.Name;
        variety.PlantSpacing = request.PlantSpacing;
        variety.RowSpacing = request.RowSpacing;
        variety.WaterMmPerSeason = request.WaterMmPerSeason;
        variety.FertilizerKgPer100m2 = request.FertilizerKgPer100m2;
        variety.SeedBufferPercent = request.SeedBufferPercent;
        variety.SeedUnit = request.SeedUnit;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var variety = await _db.VegetableVarieties.FirstOrDefaultAsync(v => v.Id == id);
        if (variety is null)
        {
            return false;
        }

        _db.VegetableVarieties.Remove(variety);
        await _db.SaveChangesAsync();
        return true;
    }

    private static VegetableVarietyDto ToDto(VegetableVariety variety) => new()
    {
        Id = variety.Id,
        Name = variety.Name,
        PlantSpacing = variety.PlantSpacing,
        RowSpacing = variety.RowSpacing,
        WaterMmPerSeason = variety.WaterMmPerSeason,
        FertilizerKgPer100m2 = variety.FertilizerKgPer100m2,
        SeedBufferPercent = variety.SeedBufferPercent,
        SeedUnit = variety.SeedUnit,
        CreatedAt = variety.CreatedAt,
    };
}
