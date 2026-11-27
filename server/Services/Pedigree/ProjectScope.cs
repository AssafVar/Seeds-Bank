using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services.Pedigree;

// The ONE place that resolves ids from a request. Every id (route, query,
// body, undo payload) is hostile: it is looked up together with the project
// id, never by itself, so a foreign id and an unknown id are
// indistinguishable. Plant ids are a global key, so never FindAsync here.
public sealed class ProjectScope
{
    private readonly AppDbContext _db;

    public ProjectScope(AppDbContext db, string projectId)
    {
        _db = db;
        ProjectId = projectId;
    }

    public string ProjectId { get; }

    public Task<ProjectItem?> FindPlantAsync(string? plantId, bool track = false)
    {
        if (string.IsNullOrWhiteSpace(plantId)) return Task.FromResult<ProjectItem?>(null);
        var query = track ? _db.ProjectItems : _db.ProjectItems.AsNoTracking();
        return query.FirstOrDefaultAsync(i => i.ProjectId == ProjectId && i.PlantId == plantId);
    }

    public Task<Line?> FindLineAsync(int? lineId, bool track = false)
    {
        if (lineId is null) return Task.FromResult<Line?>(null);
        var query = track ? _db.Lines : _db.Lines.AsNoTracking();
        return query.FirstOrDefaultAsync(l => l.ProjectId == ProjectId && l.Id == lineId);
    }

    public Task<Population?> FindPopulationAsync(int? populationId, bool track = false)
    {
        if (populationId is null) return Task.FromResult<Population?>(null);
        var query = track ? _db.Populations : _db.Populations.AsNoTracking();
        return query.FirstOrDefaultAsync(p => p.ProjectId == ProjectId && p.Id == populationId);
    }

    public Task<Field?> FindFieldAsync(int? fieldId)
    {
        if (fieldId is null) return Task.FromResult<Field?>(null);
        return _db.Fields.AsNoTracking().FirstOrDefaultAsync(f => f.ProjectId == ProjectId && f.Id == fieldId);
    }

    // Origins are reached through their line, never by their own id.
    public async Task<List<LineOrigin>> GetOriginsAsync(int lineId)
    {
        if (!await _db.Lines.AnyAsync(l => l.ProjectId == ProjectId && l.Id == lineId)) return new List<LineOrigin>();
        return await _db.LineOrigins.AsNoTracking().Where(o => o.LineId == lineId).ToListAsync();
    }

    public async Task<Line> RequireLineAsync(int? lineId, bool track = false) =>
        await FindLineAsync(lineId, track) ?? throw PedigreeException.LineNotFound();

    public async Task<Population> RequirePopulationAsync(int? populationId, bool track = false) =>
        await FindPopulationAsync(populationId, track) ?? throw PedigreeException.PopulationNotFound();

    public async Task<Field> RequireFieldAsync(int? fieldId) =>
        await FindFieldAsync(fieldId) ?? throw PedigreeException.FieldNotFound();

    // Parent lookup: the same 400 for an unknown id, another user's plant and
    // a plant of the caller's other project.
    public async Task<ProjectItem> RequireParentAsync(string field, string? plantId) =>
        await FindPlantAsync(plantId) ?? throw PedigreeException.ParentNotFound(field, plantId);

    // One query over this project's (plant, mother, father) edges for the
    // ancestor walk; other projects' rows are never loaded.
    public async Task<Dictionary<string, AncestorWalk.Edge>> LoadParentEdgesAsync() =>
        (await _db.ProjectItems.AsNoTracking()
            .Where(i => i.ProjectId == ProjectId)
            .Select(i => new { i.PlantId, i.MotherPlantId, i.FatherPlantId })
            .ToListAsync())
        .ToDictionary(i => i.PlantId, i => new AncestorWalk.Edge(i.MotherPlantId, i.FatherPlantId), StringComparer.Ordinal);
}
