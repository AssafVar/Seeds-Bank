using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;

namespace SeedsBank.Server.Services.Pedigree;

// Runs one write unit. Every failure leaves nothing half-tracked in the
// context (a validation error thrown after an entity was added must not be
// saved by a later SaveChanges), and a database failure (a lost race on a
// tag counter or a unique index, a stale version) becomes the caller's
// fixed-text 409: exception text and SQL never leave the server.
internal static class ServiceWrites
{
    public static async Task<T> RunAsync<T>(
        AppDbContext db, int attempts, Func<PedigreeException> onExhausted, Func<Task<T>> body)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await body();
            }
            catch (DbUpdateException) // includes DbUpdateConcurrencyException
            {
                db.ChangeTracker.Clear();
                if (attempt >= attempts) throw onExhausted();

                // Jittered backoff so writers that collided do not collide
                // again; bounded (about 0.7 s over six attempts).
                await Task.Delay(Random.Shared.Next(5, 20 * attempt + 10));
            }
            catch
            {
                db.ChangeTracker.Clear();
                throw;
            }
        }
    }

    public static PedigreeException WriteConflict() =>
        PedigreeException.Conflict(null, PedigreeCodes.WriteConflict,
            "That could not be saved because of a simultaneous change. Try again.");

    public static PedigreeException VersionConflict() =>
        PedigreeException.Conflict(null, PedigreeCodes.VersionConflict,
            "This plant was changed elsewhere. Reload to see the latest.");
}

// "Spring 2026 · North field", "No field yet", "Unspecified season".
public static class PopulationNames
{
    public static string Name(string? season, int? year, string? fieldName)
    {
        var when = season is null && year is null
            ? "Unspecified season"
            : string.Join(' ', new[] { season, year?.ToString() }.Where(x => !string.IsNullOrEmpty(x)));
        return $"{when} · {fieldName ?? "No field yet"}";
    }
}

// Loads the project's lines in the shape the pure rules want.
internal static class LineInfoLoader
{
    public static async Task<Dictionary<int, LineInfo>> LoadAsync(AppDbContext db, string projectId)
    {
        var lines = await db.Lines.AsNoTracking()
            .Where(l => l.ProjectId == projectId)
            .Select(l => new { l.Id, l.Name, l.IsFounders, l.SuccessorLineId })
            .ToListAsync();

        var origins = await db.LineOrigins.AsNoTracking()
            .Where(o => o.Line.ProjectId == projectId)
            .Select(o => new { o.LineId, o.Role, o.SourceLineId })
            .ToListAsync();

        // EXISTS on the population_id index, not a scan of every plant.
        var linesWithPlants = (await db.Populations.AsNoTracking()
                .Where(p => p.ProjectId == projectId && db.ProjectItems.Any(i => i.PopulationId == p.Id))
                .Select(p => p.LineId)
                .Distinct()
                .ToListAsync())
            .ToHashSet();

        var forkedFrom = origins
            .Where(o => o.Role == Models.LineOrigin.RoleForkedFrom && o.SourceLineId != null)
            .GroupBy(o => o.LineId)
            .ToDictionary(g => g.Key, g => g.First().SourceLineId);
        var withOrigin = origins.Select(o => o.LineId).ToHashSet();

        return lines.ToDictionary(
            l => l.Id,
            l => new LineInfo(l.Id, l.Name, l.IsFounders, l.SuccessorLineId,
                forkedFrom.GetValueOrDefault(l.Id), linesWithPlants.Contains(l.Id), withOrigin.Contains(l.Id)));
    }
}
