using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services.Pedigree;

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
            .Include(i => i.Population).ThenInclude(p => p.Line)
            .Where(i => i.ProjectId == projectId)
            .ToListAsync();

        return new ProjectDetailResponse
        {
            ProjectHeaders = ToHeaderDto(project),
            ProjectDetails = items.Select(i => ToItemDto(i, project.ProjectName)).ToList(),
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

    // TEMPORARY (replaced by the per-plant endpoints and a 410 in T-4/T-5):
    // the old whole-list save, kept compiling and behaving the same on the new
    // schema. A legacy line name becomes a line, (line, generation) a
    // population, and "---" or an unknown parent id becomes no parent.
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
        var knownPlantIds = (await _db.ProjectItems.AsNoTracking()
                .Where(i => i.ProjectId == projectId).Select(i => i.PlantId).ToListAsync())
            .Concat(plantIds).ToHashSet(StringComparer.Ordinal);

        var lines = await _db.Lines.Where(l => l.ProjectId == projectId).ToListAsync();
        var populations = await _db.Populations.Where(p => p.ProjectId == projectId).ToListAsync();

        foreach (var item in ownItems)
        {
            var population = FindOrCreatePopulation(projectId, lines, populations, item);
            if (existing.TryGetValue(item.PlantId, out var entity))
            {
                ApplyItem(entity, item, population, knownPlantIds);
            }
            else
            {
                var line = population.Line;
                var newEntity = new ProjectItem { PlantId = item.PlantId, ProjectId = projectId, Tag = $"{line.Code}-{line.NextSeq:000}" };
                line.NextSeq++;
                ApplyItem(newEntity, item, population, knownPlantIds);
                _db.ProjectItems.Add(newEntity);
            }
        }

        project.LastUpdate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    private Population FindOrCreatePopulation(string projectId, List<Line> lines, List<Population> populations, ProjectItemDto item)
    {
        var name = IsBlank(item.Line) ? null : item.Line.Trim();
        var line = name is null
            ? lines.FirstOrDefault(l => l.IsFounders)
            : lines.FirstOrDefault(l => !l.IsFounders && string.Equals(l.Name, name, StringComparison.OrdinalIgnoreCase));

        if (line is null)
        {
            line = name is null
                ? new Line { ProjectId = projectId, Name = "Founders", Code = "P", IsFounders = true }
                : new Line
                {
                    ProjectId = projectId,
                    Name = name.Length > 100 ? name[..100] : name,
                    Code = LineCodes.From(name, lines.Select(l => l.Code)),
                };
            _db.Lines.Add(line);
            lines.Add(line);
        }

        var parentless = IsBlank(item.PlantMotherId) && IsBlank(item.PlantFatherId);
        var kind = parentless ? 'P' : item.PlantMotherId == item.PlantFatherId ? 'S' : 'F';

        var population = populations.FirstOrDefault(p =>
            p.Line == line && p.Kind == kind && p.Generation == item.Generation && p.Season == null && p.Year == null && p.FieldId == null);
        if (population is null)
        {
            population = new Population { ProjectId = projectId, Line = line, Kind = kind, Generation = item.Generation };
            _db.Populations.Add(population);
            populations.Add(population);
        }

        return population;
    }

    private static bool IsBlank(string? value) => string.IsNullOrWhiteSpace(value) || value.Trim() == "---";

    public async Task<bool> DeletePlantAsync(string userId, string projectId, string plantId)
    {
        if (!await IsProjectOwnedAsync(userId, projectId))
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

    private static void ApplyItem(ProjectItem entity, ProjectItemDto dto, Population population, HashSet<string> knownPlantIds)
    {
        entity.Population = population;
        entity.FruitColor = Trait(dto.FruitColor);
        entity.FruitWeight = Trait(dto.FruitWeight);
        entity.SeedColor = Trait(dto.SeedColor);
        entity.SeedWeight = Trait(dto.SeedWeight);
        entity.FatherPlantId = ParentId(dto.PlantFatherId, dto.PlantId, knownPlantIds);
        entity.MotherPlantId = ParentId(dto.PlantMotherId, dto.PlantId, knownPlantIds);
        entity.RowVersion++;
    }

    private static string? Trait(string? value) => IsBlank(value) ? null : value;

    private static string? ParentId(string? value, string ownId, HashSet<string> knownPlantIds) =>
        IsBlank(value) || value == ownId || !knownPlantIds.Contains(value!) ? null : value;

    private static ProjectHeaderDto ToHeaderDto(Project project) => new()
    {
        ProjectName = project.ProjectName,
        UserId = project.UserId,
        ProjectId = project.ProjectId,
        PlantType = project.PlantType,
        StartDate = project.StartDate.ToString(DateFormat, CultureInfo.InvariantCulture),
        LastUpdate = project.LastUpdate.ToString(DateFormat, CultureInfo.InvariantCulture),
    };

    private static ProjectItemDto ToItemDto(ProjectItem item, string projectName) => new()
    {
        Line = item.Population.Line.IsFounders ? "---" : item.Population.Line.Name,
        ProjectName = projectName,
        ProjectId = item.ProjectId,
        PlantId = item.PlantId,
        PlantFatherId = item.FatherPlantId ?? "---",
        PlantMotherId = item.MotherPlantId ?? "---",
        FruitColor = item.FruitColor ?? "---",
        FruitWeight = item.FruitWeight ?? "---",
        SeedColor = item.SeedColor ?? "---",
        SeedWeight = item.SeedWeight ?? "---",
        Generation = item.Population.Generation ?? 0,
    };

    public Task<bool> IsProjectOwnedAsync(string userId, string projectId) =>
        _db.Projects.AnyAsync(p => p.UserId == userId && p.ProjectId == projectId);
}
