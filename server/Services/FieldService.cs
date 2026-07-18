using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class FieldService : IFieldService
{
    private readonly AppDbContext _db;

    public FieldService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<FieldDto>> GetByProjectAsync(string projectId)
    {
        var fields = await _db.Fields.AsNoTracking()
            .Where(f => f.ProjectId == projectId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return fields.Select(ToDto).ToList();
    }

    public async Task<FieldDto> CreateAsync(string projectId, FieldRequest request)
    {
        var field = new Field
        {
            ProjectId = projectId,
            Name = request.Name,
            LandWidth = request.LandWidth,
            LandLength = request.LandLength,
            PlantSpacing = request.PlantSpacing,
            RowSpacing = request.RowSpacing,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Fields.Add(field);
        await _db.SaveChangesAsync();

        return ToDto(field);
    }

    public async Task<bool> DeleteAsync(string projectId, int fieldId)
    {
        var field = await _db.Fields
            .FirstOrDefaultAsync(f => f.Id == fieldId && f.ProjectId == projectId);
        if (field is null)
        {
            return false;
        }

        _db.Fields.Remove(field);
        await _db.SaveChangesAsync();
        return true;
    }

    // Standard "fence post" planting-density formula: a plant at position 0
    // and every `spacing` unit after, fitting as many as the land allows.
    private static FieldDto ToDto(Field field)
    {
        var plantsPerRow = (int)Math.Floor(field.LandWidth / field.PlantSpacing) + 1;
        var numberOfRows = (int)Math.Floor(field.LandLength / field.RowSpacing) + 1;

        return new FieldDto
        {
            Id = field.Id,
            Name = field.Name,
            LandWidth = field.LandWidth,
            LandLength = field.LandLength,
            PlantSpacing = field.PlantSpacing,
            RowSpacing = field.RowSpacing,
            PlantsPerRow = plantsPerRow,
            NumberOfRows = numberOfRows,
            TotalCapacity = plantsPerRow * numberOfRows,
            CreatedAt = field.CreatedAt,
        };
    }
}
