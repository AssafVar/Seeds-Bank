using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Services;

public class LineService : ILineService
{
    private readonly AppDbContext _db;
    private readonly PedigreeOptions _options;

    public LineService(AppDbContext db, IOptions<PedigreeOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    // ---- reads ----

    public Task<List<LineDto>> GetOverviewAsync(string projectId) => BuildAsync(projectId, null);

    // One line (with what its verdict needs: its populations and those of the
    // lines it was branched from) without loading the rest of the project.
    public async Task<LineDto?> GetLineAsync(string projectId, int lineId) =>
        (await BuildAsync(projectId, lineId)).FirstOrDefault(l => l.Id == lineId);

    private async Task<List<LineDto>> BuildAsync(string projectId, int? onlyLineId)
    {
        var lines = await _db.Lines.AsNoTracking()
            .Where(l => l.ProjectId == projectId)
            .OrderBy(l => l.Id)
            .ToListAsync();
        var origins = await _db.LineOrigins.AsNoTracking()
            .Where(o => o.Line.ProjectId == projectId)
            .ToListAsync();

        var forkedFrom = origins
            .Where(o => o.Role == LineOrigin.RoleForkedFrom && o.SourceLineId != null)
            .GroupBy(o => o.LineId)
            .ToDictionary(g => g.Key, g => g.First().SourceLineId!.Value);

        // Which lines' populations and plants are needed: all of them for the
        // overview, otherwise the line and its branch ancestors.
        List<int>? neededLines = onlyLineId is { } only ? ChainOf(only, forkedFrom).ToList() : null;

        var populationQuery = _db.Populations.AsNoTracking().Where(p => p.ProjectId == projectId);
        if (neededLines is not null) populationQuery = populationQuery.Where(p => neededLines.Contains(p.LineId));
        var populations = await populationQuery.ToListAsync();
        var populationIds = populations.Select(p => p.Id).ToList();

        // Only this project's fields: a field of another project can never
        // supply a name, whatever a row points at.
        var fieldNames = await _db.Fields.AsNoTracking()
            .Where(f => f.ProjectId == projectId)
            .Select(f => new { f.Id, f.Name })
            .ToDictionaryAsync(f => f.Id, f => f.Name);

        var countQuery = _db.ProjectItems.AsNoTracking().Where(i => i.ProjectId == projectId);
        if (neededLines is not null) countQuery = countQuery.Where(i => populationIds.Contains(i.PopulationId));
        var plantCounts = await countQuery
            .GroupBy(i => i.PopulationId)
            .Select(g => new { PopulationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.PopulationId, g => g.Count);

        var traitQuery = _db.ProjectItems.AsNoTracking().Where(i => i.ProjectId == projectId && !i.Population.Line.IsFounders);
        if (neededLines is not null) traitQuery = traitQuery.Where(i => populationIds.Contains(i.PopulationId));
        var traitRows = await traitQuery
            .Select(i => new { i.PopulationId, i.FruitColor, i.FruitWeight, i.SeedColor, i.SeedWeight })
            .ToListAsync();
        var traitsByPopulation = traitRows
            .GroupBy(r => r.PopulationId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<PlantTraits>)g.Select(r => PlantTraits.FromText(r.FruitColor, r.FruitWeight, r.SeedColor, r.SeedWeight)).ToList());

        var originsByLine = origins.ToLookup(o => o.LineId);
        var populationsByLine = populations.ToLookup(p => p.LineId);
        var forksOf = forkedFrom
            .GroupBy(kv => kv.Value)
            .ToDictionary(g => g.Key, g => g.Select(kv => kv.Key).OrderBy(x => x).ToList());
        var linesById = lines.ToDictionary(l => l.Id);

        var result = new List<LineDto>();
        foreach (var line in lines.Where(l => onlyLineId is null || l.Id == onlyLineId))
        {
            var own = populationsByLine[line.Id].ToList();
            var maxGeneration = own.Where(p => p.Generation != null).Select(p => p.Generation!.Value).DefaultIfEmpty(-1).Max();
            var plantCount = own.Sum(p => plantCounts.GetValueOrDefault(p.Id));

            // A line is judged on its own populations plus those of the lines
            // it was branched from, so a fork shows the verdict of its source
            // until it has plants of its own, and the source never changes
            // when its fork gets plants.
            var samples = new List<GenerationSample>();
            foreach (var lineId in ChainOf(line.Id, forkedFrom))
            {
                foreach (var p in populationsByLine[lineId])
                {
                    if (p.Generation is null || p.Kind is null) continue;
                    samples.Add(new GenerationSample(
                        TagFormatter.Label(p.Kind.Value, p.Generation.Value),
                        p.Generation.Value,
                        traitsByPopulation.GetValueOrDefault(p.Id) ?? Array.Empty<PlantTraits>()));
                }
            }
            var stability = StabilityEvaluator.Evaluate(line.IsFounders, line.IsStable, samples);

            result.Add(new LineDto
            {
                Id = line.Id,
                Name = line.Name,
                Code = line.Code,
                IsFounders = line.IsFounders,
                IsStable = line.IsStable,
                StableMarkedAt = line.StableMarkedAt,
                LooksStable = stability.LooksStable,
                StabilityState = stability.State,
                Stability = new StabilityDto { GenerationsJudged = stability.GenerationsJudged.ToList() },
                SuccessorLineId = line.SuccessorLineId,
                Forks = forksOf.GetValueOrDefault(line.Id)?
                    .Where(linesById.ContainsKey)
                    .Select(id => new LineForkDto { LineId = id, Name = linesById[id].Name })
                    .ToList() ?? new List<LineForkDto>(),
                OriginNote = line.OriginNote,
                Origin = BuildOrigin(line, originsByLine[line.Id].ToList(), plantCount),
                PlantCount = plantCount,
                Populations = own
                    .OrderByDescending(p => p.Generation ?? -1)
                    .ThenByDescending(p => (int?)p.Year ?? -1)
                    .ThenByDescending(p => p.Id)
                    .Select(p => ToPopulationDto(p, plantCounts.GetValueOrDefault(p.Id),
                        p.FieldId is { } f ? fieldNames.GetValueOrDefault(f) : null,
                        line.IsFounders || (p.Generation != null && p.Generation == maxGeneration)))
                    .ToList(),
            });
        }

        return result;
    }

    // The line and the lines it was branched from (cycle-safe).
    private static IEnumerable<int> ChainOf(int lineId, IReadOnlyDictionary<int, int> forkedFrom)
    {
        var seen = new HashSet<int>();
        int? current = lineId;
        while (current is { } id && seen.Add(id))
        {
            yield return id;
            current = forkedFrom.TryGetValue(id, out var source) ? source : null;
        }
    }

    private static LineOriginDto BuildOrigin(Line line, List<LineOrigin> origins, int plantCount)
    {
        var dto = new LineOriginDto();
        if (line.IsFounders)
        {
            dto.Kind = "founders";
            return dto;
        }

        var fork = origins.FirstOrDefault(o => o.Role == LineOrigin.RoleForkedFrom);
        var mother = origins.FirstOrDefault(o => o.Role == LineOrigin.RoleMother);
        var father = origins.FirstOrDefault(o => o.Role == LineOrigin.RoleFather);

        if (fork is not null)
        {
            dto.Kind = "renamed";
            dto.ForkedFrom = new LineOriginForkDto { LineId = fork.SourceLineId, LineName = fork.SourceLineName, Label = fork.SourceLabel };
        }
        else if (mother is not null || father is not null)
        {
            dto.Kind = mother?.SourcePlantTag is not null && mother.SourcePlantTag == father?.SourcePlantTag ? "self" : "cross";
        }
        else
        {
            // No origin rows: a line made by hand and still empty (or with a
            // note), otherwise a legacy line that came in with the old data.
            dto.Kind = plantCount == 0 || line.OriginNote is not null ? "manual" : "imported";
        }

        foreach (var o in origins.Where(o => o.Role != LineOrigin.RoleForkedFrom).OrderBy(o => o.Role == LineOrigin.RoleMother ? 0 : 1))
        {
            dto.Parents.Add(new LineOriginParentDto
            {
                Role = o.Role,
                LineId = o.SourceLineId,
                LineName = o.SourceLineName,
                Label = o.SourceLabel,
                PlantTag = o.SourcePlantTag,
            });
        }

        return dto;
    }

    private static PopulationDto ToPopulationDto(Population p, int plantCount, string? fieldName, bool isLatest) => new()
    {
        Id = p.Id,
        Kind = p.Kind?.ToString(),
        Generation = p.Generation,
        Label = p.Kind is { } k && p.Generation is { } g ? TagFormatter.Label(k, g) : null,
        Name = PopulationNames.Name(p.Season, p.Year, fieldName),
        Season = p.Season,
        Year = p.Year,
        FieldId = p.FieldId,
        FieldName = fieldName,
        PlantCount = plantCount,
        IsLatestGeneration = isLatest,
    };

    // ---- lines ----

    public Task<LineDto> CreateLineAsync(string projectId, CreateLineRequest request)
    {
        var name = InputRules.ValidateLineName(request.Name);
        var note = InputRules.ValidateOriginNote(request.OriginNote);

        return ServiceWrites.RunAsync(_db, 3, NameTaken, async () =>
        {
            await EnsureLineQuotaAsync(projectId);
            await EnsureNameFreeAsync(projectId, name);

            var line = NewLine(projectId, name, await TakenCodesAsync(projectId));
            line.OriginNote = note;
            _db.Lines.Add(line);
            await _db.SaveChangesAsync();

            return (await GetLineAsync(projectId, line.Id))!;
        });
    }

    public async Task<RenameLineResponse?> RenameLineAsync(string projectId, int lineId, RenameLineRequest request)
    {
        var scope = new ProjectScope(_db, projectId);
        var old = await scope.FindLineAsync(lineId, track: true);
        if (old is null) return null;

        if (old.IsFounders) throw FoundersLine();
        var name = InputRules.ValidateLineName(request.NewName);

        Population? from = null;
        if (request.FromPopulationId is not null)
        {
            // A population of another line of this project is as unknown as
            // one of another user.
            from = await scope.FindPopulationAsync(request.FromPopulationId);
            if (from is null || from.LineId != old.Id) throw PedigreeException.PopulationNotFound();
        }

        return await ServiceWrites.RunAsync(_db, 3, NameTaken, async () =>
        {
            var line = await scope.RequireLineAsync(lineId, track: true);
            await EnsureLineQuotaAsync(projectId);
            await EnsureNameFreeAsync(projectId, name);

            var label = from?.Kind is { } fk && from.Generation is { } fg
                ? TagFormatter.Label(fk, fg)
                : await LatestLabelAsync(line.Id);

            var created = NewLine(projectId, name, await TakenCodesAsync(projectId));
            created.IsStable = line.IsStable;
            created.StableMarkedAt = line.StableMarkedAt;
            created.Origins.Add(new LineOrigin
            {
                Role = LineOrigin.RoleForkedFrom,
                SourceLineId = line.Id,
                SourceLineName = line.Name,
                SourceLabel = label,
            });
            _db.Lines.Add(created);
            line.Successor = created;
            await _db.SaveChangesAsync();

            var overview = await GetOverviewAsync(projectId);
            return new RenameLineResponse
            {
                NewLine = overview.First(l => l.Id == created.Id),
                OldLine = overview.First(l => l.Id == line.Id),
            };
        });
    }

    public async Task<LineDto?> SetStableAsync(string projectId, int lineId, bool isStable)
    {
        var scope = new ProjectScope(_db, projectId);
        var line = await scope.FindLineAsync(lineId, track: true);
        if (line is null) return null;
        if (line.IsFounders) throw FoundersLine();

        return await ServiceWrites.RunAsync(_db, 1, ServiceWrites.WriteConflict, async () =>
        {
            line.IsStable = isStable;
            line.StableMarkedAt = isStable ? DateTime.UtcNow : null;
            await _db.SaveChangesAsync();
            return await GetLineAsync(projectId, lineId);
        });
    }

    public async Task<bool> DeleteLineAsync(string projectId, int lineId)
    {
        var scope = new ProjectScope(_db, projectId);
        var line = await scope.FindLineAsync(lineId, track: true);
        if (line is null) return false;

        // State checks only after the line is proven to be this project's.
        if (line.IsFounders) throw FoundersLine();
        if (await _db.ProjectItems.AnyAsync(i => i.ProjectId == projectId && i.Population.LineId == lineId))
        {
            throw PedigreeException.Conflict(PedigreeFields.Line, PedigreeCodes.LineNotEmpty,
                "This line has plants. Remove them first.");
        }
        if (line.SuccessorLineId is not null)
        {
            throw PedigreeException.Conflict(PedigreeFields.Line, PedigreeCodes.LineHasSuccessor,
                "This line was continued as another line, so it cannot be deleted.");
        }

        return await ServiceWrites.RunAsync(_db, 1, ServiceWrites.WriteConflict, async () =>
        {
            // The line that pointed at this one now points at its most recent
            // remaining fork, or at nothing.
            var predecessors = await _db.Lines.Where(l => l.ProjectId == projectId && l.SuccessorLineId == lineId).ToListAsync();
            foreach (var predecessor in predecessors)
            {
                predecessor.SuccessorLineId = await _db.LineOrigins
                    .Where(o => o.Role == LineOrigin.RoleForkedFrom && o.SourceLineId == predecessor.Id
                        && o.LineId != lineId && o.Line.ProjectId == projectId)
                    .OrderByDescending(o => o.LineId)
                    .Select(o => (int?)o.LineId)
                    .FirstOrDefaultAsync();
            }

            // Snapshots in other lines' origins keep name and label.
            var referencing = await _db.LineOrigins
                .Where(o => o.SourceLineId == lineId && o.Line.ProjectId == projectId).ToListAsync();
            foreach (var origin in referencing) origin.SourceLineId = null;

            _db.Populations.RemoveRange(await _db.Populations.Where(p => p.ProjectId == projectId && p.LineId == lineId).ToListAsync());
            _db.LineOrigins.RemoveRange(await _db.LineOrigins.Where(o => o.LineId == lineId).ToListAsync());
            _db.Lines.Remove(line);
            await _db.SaveChangesAsync();
            return true;
        });
    }

    // ---- populations ----

    public async Task<PopulationDto> CreatePopulationAsync(string projectId, CreatePopulationRequest request)
    {
        var scope = new ProjectScope(_db, projectId);
        var season = InputRules.ValidateSeason(request.Season)
            ?? throw new PedigreeException("season", PedigreeCodes.InvalidInput, "Pick a season.");
        var year = InputRules.ValidateYear(request.Year);

        var line = await scope.RequireLineAsync(request.LineId);
        if (request.FieldId is not null) await scope.RequireFieldAsync(request.FieldId);
        return await CreateAfterChecksAsync(projectId, line, season, year, request.FieldId);
    }

    private Task<PopulationDto> CreateAfterChecksAsync(string projectId, Line line, string season, short? year, int? fieldId) =>
        ServiceWrites.RunAsync(_db, 1, ServiceWrites.WriteConflict, async () =>
        {
            var populationCount = await _db.Populations.CountAsync(p => p.ProjectId == projectId && p.LineId == line.Id);
            if (populationCount >= _options.MaxPopulationsPerLine)
            {
                throw new PedigreeException(PedigreeFields.Line, PedigreeCodes.QuotaExceeded,
                    $"This line is at its limit of {_options.MaxPopulationsPerLine} populations.");
            }

            var duplicate = await _db.Populations.AnyAsync(p =>
                p.ProjectId == projectId && p.LineId == line.Id && p.Kind == null && p.Generation == null
                && p.Season == season && p.Year == year && p.FieldId == fieldId);
            if (duplicate)
            {
                throw PedigreeException.Conflict(PedigreeFields.PopulationId, PedigreeCodes.PopulationExists,
                    "This population already exists and has no plants yet.");
            }

            // The project comes from the line, never from the request.
            var population = new Population { ProjectId = line.ProjectId, LineId = line.Id, Season = season, Year = year, FieldId = fieldId };
            _db.Populations.Add(population);
            await _db.SaveChangesAsync();

            var dto = (await GetLineAsync(projectId, line.Id))!.Populations.First(p => p.Id == population.Id);
            return dto;
        });

    public async Task<bool> DeletePopulationAsync(string projectId, int populationId)
    {
        var scope = new ProjectScope(_db, projectId);
        var population = await scope.FindPopulationAsync(populationId, track: true);
        if (population is null) return false;

        if (await _db.ProjectItems.AnyAsync(i => i.ProjectId == projectId && i.PopulationId == populationId))
        {
            throw PedigreeException.Conflict(PedigreeFields.PopulationId, PedigreeCodes.PopulationNotEmpty,
                "This population has plants. Remove them first.");
        }

        return await ServiceWrites.RunAsync(_db, 1, ServiceWrites.WriteConflict, async () =>
        {
            _db.Populations.Remove(population);
            await _db.SaveChangesAsync();
            return true;
        });
    }

    // ---- helpers ----

    private static PedigreeException FoundersLine() =>
        new(PedigreeFields.Line, PedigreeCodes.FoundersLine, "The Founders line cannot be changed this way.");

    private static PedigreeException NameTaken() =>
        PedigreeException.Conflict(PedigreeFields.LineName, PedigreeCodes.LineNameTaken,
            "A line with that name already exists in this project.");

    private static Line NewLine(string projectId, string name, IEnumerable<string> takenCodes) => new()
    {
        ProjectId = projectId,
        Name = name,
        Code = LineCodes.From(name, takenCodes),
    };

    private async Task<List<string>> TakenCodesAsync(string projectId) =>
        await _db.Lines.AsNoTracking().Where(l => l.ProjectId == projectId).Select(l => l.Code).ToListAsync();

    private async Task EnsureLineQuotaAsync(string projectId)
    {
        if (await _db.Lines.CountAsync(l => l.ProjectId == projectId) >= _options.MaxLinesPerProject)
        {
            throw new PedigreeException(PedigreeFields.Line, PedigreeCodes.QuotaExceeded,
                $"This project is at its limit of {_options.MaxLinesPerProject} lines.");
        }
    }

    // Case-insensitive, whatever the column collation does.
    private async Task EnsureNameFreeAsync(string projectId, string name)
    {
        var lower = name.ToLower();
        if (await _db.Lines.AnyAsync(l => l.ProjectId == projectId && l.Name.ToLower() == lower))
        {
            throw new PedigreeException(PedigreeFields.LineName, PedigreeCodes.LineNameTaken,
                $"A line named {name} already exists in this project.", 409);
        }
    }

    // The label of the line's newest generation ("" for an empty line).
    private async Task<string> LatestLabelAsync(int lineId)
    {
        var latest = await _db.Populations.AsNoTracking()
            .Where(p => p.LineId == lineId && p.Generation != null && p.Kind != null)
            .OrderByDescending(p => p.Generation)
            .ThenByDescending(p => p.Id)
            .Select(p => new { p.Kind, p.Generation })
            .FirstOrDefaultAsync();
        return latest is null ? string.Empty : TagFormatter.Label(latest.Kind!.Value, latest.Generation!.Value);
    }
}
