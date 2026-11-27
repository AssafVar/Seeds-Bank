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
    private readonly ILineService _lines;

    public ProjectsService(AppDbContext db, ILineService lines)
    {
        _db = db;
        _lines = lines;
    }

    public async Task<ProjectOverviewResponse?> GetProjectAsync(string userId, string projectId)
    {
        var project = await _db.Projects.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ProjectId == projectId);

        if (project is null)
        {
            return null;
        }

        return new ProjectOverviewResponse
        {
            ProjectHeaders = ToHeaderDto(project),
            Lines = await _lines.GetOverviewAsync(projectId),
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

        // Every project has exactly one built-in Founders line (code P).
        _db.Lines.Add(new Line
        {
            ProjectId = request.ProjectId,
            Name = "Founders",
            Code = "P",
            IsFounders = true,
        });

        await _db.SaveChangesAsync();
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

    public Task<bool> IsProjectOwnedAsync(string userId, string projectId) =>
        _db.Projects.AnyAsync(p => p.UserId == userId && p.ProjectId == projectId);
}
