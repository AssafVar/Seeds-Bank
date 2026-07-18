using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class ProjectsService : IProjectsService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly AppDbContext _db;

    public ProjectsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ProjectDetailResponse?> GetProjectAsync(string userId, string projectId)
    {
        var project = await _db.Projects.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ProjectId == projectId);

        if (project is null)
        {
            return null;
        }

        var items = await _db.ProjectItems.AsNoTracking()
            .Where(i => i.ProjectId == projectId)
            .ToListAsync();

        return new ProjectDetailResponse
        {
            ProjectHeaders = ToHeaderDto(project),
            ProjectDetails = items.Select(ToItemDto).ToList(),
        };
    }

    public async Task<List<ProjectHeaderDto>> GetUserProjectsAsync(string userId)
    {
        var projects = await _db.Projects.AsNoTracking()
            .Where(p => p.UserId == userId)
            .ToListAsync();

        return projects.Select(ToHeaderDto).ToList();
    }

    public async Task CreateProjectAsync(string userId, CreateProjectRequest request)
    {
        var now = DateTime.UtcNow;
        _db.Projects.Add(new Project
        {
            ProjectId = request.ProjectId,
            UserId = userId,
            ProjectName = request.ProjectName,
            PlantType = request.PlantType,
            StartDate = now,
            LastUpdate = now,
        });

        await _db.SaveChangesAsync();
    }

    public async Task<bool> UpdateProjectDetailsAsync(string userId, string projectId, List<ProjectItemDto> items)
    {
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ProjectId == projectId);
        if (project is null)
        {
            return false;
        }

        // Only accept rows that actually claim to belong to this project, so a
        // caller can't use a plant_id borrowed from someone else's project to
        // overwrite it via a project they legitimately own.
        var ownItems = items.Where(i => i.ProjectId == projectId).ToList();
        var plantIds = ownItems.Select(i => i.PlantId).ToList();
        var existing = await _db.ProjectItems
            .Where(i => plantIds.Contains(i.PlantId) && i.ProjectId == projectId)
            .ToDictionaryAsync(i => i.PlantId);

        foreach (var item in ownItems)
        {
            if (existing.TryGetValue(item.PlantId, out var entity))
            {
                ApplyItem(entity, item);
            }
            else
            {
                var newEntity = new ProjectItem { PlantId = item.PlantId };
                ApplyItem(newEntity, item);
                _db.ProjectItems.Add(newEntity);
            }
        }

        project.LastUpdate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeletePlantAsync(string userId, string projectId, string plantId)
    {
        var projectOwned = await _db.Projects
            .AnyAsync(p => p.UserId == userId && p.ProjectId == projectId);
        if (!projectOwned)
        {
            return false;
        }

        var entity = await _db.ProjectItems
            .FirstOrDefaultAsync(i => i.PlantId == plantId && i.ProjectId == projectId);
        if (entity is null)
        {
            return false;
        }

        _db.ProjectItems.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    private static void ApplyItem(ProjectItem entity, ProjectItemDto dto)
    {
        entity.Line = dto.Line;
        entity.ProjectName = dto.ProjectName;
        entity.ProjectId = dto.ProjectId;
        entity.FruitColor = dto.FruitColor;
        entity.FruitWeight = dto.FruitWeight;
        entity.SeedColor = dto.SeedColor;
        entity.SeedWeight = dto.SeedWeight;
        entity.PlantFatherId = dto.PlantFatherId;
        entity.PlantMotherId = dto.PlantMotherId;
        entity.Generation = dto.Generation;
    }

    private static ProjectHeaderDto ToHeaderDto(Project project) => new()
    {
        ProjectName = project.ProjectName,
        UserId = project.UserId,
        ProjectId = project.ProjectId,
        PlantType = project.PlantType,
        StartDate = project.StartDate.ToString(DateFormat, CultureInfo.InvariantCulture),
        LastUpdate = project.LastUpdate.ToString(DateFormat, CultureInfo.InvariantCulture),
    };

    private static ProjectItemDto ToItemDto(ProjectItem item) => new()
    {
        Line = item.Line,
        ProjectName = item.ProjectName,
        ProjectId = item.ProjectId,
        PlantId = item.PlantId,
        PlantFatherId = item.PlantFatherId,
        PlantMotherId = item.PlantMotherId,
        FruitColor = item.FruitColor,
        FruitWeight = item.FruitWeight,
        SeedColor = item.SeedColor,
        SeedWeight = item.SeedWeight,
        Generation = item.Generation,
    };
}
