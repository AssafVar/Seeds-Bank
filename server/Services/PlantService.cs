using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Services;

public class PlantService : IPlantService
{
    private const int MaxCount = 500;
    private const int TagRetries = 6;

    private readonly AppDbContext _db;
    private readonly ILineService _lines;
    private readonly PedigreeOptions _options;

    public PlantService(AppDbContext db, ILineService lines, IOptions<PedigreeOptions> options)
    {
        _db = db;
        _lines = lines;
        _options = options.Value;
    }

    // ---- reads ----

    public async Task<PagedResultDto<PlantDto>> GetPlantsAsync(string projectId, PlantListQuery query)
    {
        var filtered = Filter(projectId, query.Q, query.LineId, query.PopulationId, query.ParentId, query.LatestOnly);
        var (page, pageSize, skip) = InputRules.ClampPaging(query.Page, query.PageSize);

        var total = await filtered.CountAsync();
        var items = await filtered
            .Include(i => i.Population)
            .OrderBy(i => i.Tag)
            .Skip((int)skip) // at most 100000 x 100, fits an int
            .Take(pageSize)
            .ToListAsync();

        return new PagedResultDto<PlantDto>
        {
            Items = await ToDtosAsync(projectId, items),
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<PlantCountsDto> GetCountsAsync(string projectId, PlantCountsQuery query)
    {
        var filtered = Filter(projectId, query.Q, query.LineId, null, null, query.LatestOnly);
        var rows = await filtered
            .GroupBy(i => new { i.PopulationId, i.Population.LineId })
            .Select(g => new { g.Key.PopulationId, g.Key.LineId, Count = g.Count() })
            .ToListAsync();

        return new PlantCountsDto
        {
            Total = rows.Sum(r => r.Count),
            Lines = rows.GroupBy(r => r.LineId)
                .Select(g => new LineCountDto { LineId = g.Key, Count = g.Sum(r => r.Count) })
                .OrderBy(l => l.LineId).ToList(),
            Populations = rows
                .Select(r => new PopulationCountDto { PopulationId = r.PopulationId, Count = r.Count })
                .OrderBy(p => p.PopulationId).ToList(),
        };
    }

    public async Task<PlantDto?> GetPlantAsync(string projectId, string plantId)
    {
        var plant = await _db.ProjectItems.AsNoTracking()
            .Include(i => i.Population)
            .FirstOrDefaultAsync(i => i.ProjectId == projectId && i.PlantId == plantId);
        return plant is null ? null : (await ToDtosAsync(projectId, new List<ProjectItem> { plant }))[0];
    }

    // Every aggregate and list starts from this project's plants; a line,
    // population or parent id of another project simply matches nothing.
    private IQueryable<ProjectItem> Filter(
        string projectId, string? q, int? lineId, int? populationId, string? parentId, bool latestOnly)
    {
        var search = InputRules.ValidateSearch(q);
        var query = _db.ProjectItems.AsNoTracking().Where(i => i.ProjectId == projectId);

        if (lineId is not null) query = query.Where(i => i.Population.LineId == lineId);
        if (populationId is not null) query = query.Where(i => i.PopulationId == populationId);
        if (!string.IsNullOrWhiteSpace(parentId))
        {
            var parent = parentId.Trim();
            query = query.Where(i => i.MotherPlantId == parent || i.FatherPlantId == parent);
        }
        if (latestOnly)
        {
            query = query.Where(i => i.Population.Line.IsFounders
                || i.Population.Generation == _db.Populations
                    .Where(p => p.LineId == i.Population.LineId)
                    .Max(p => p.Generation));
        }
        if (search is not null)
        {
            var pattern = InputRules.LikeContains(search);
            var esc = InputRules.LikeEscape;
            query = query.Where(i =>
                EF.Functions.Like(i.Tag, pattern, esc)
                || EF.Functions.Like(i.FruitColor!, pattern, esc)
                || EF.Functions.Like(i.FruitWeight!, pattern, esc)
                || EF.Functions.Like(i.SeedColor!, pattern, esc)
                || EF.Functions.Like(i.SeedWeight!, pattern, esc));
        }

        return query;
    }

    // ---- preview (read-only) ----

    public async Task<PlacementPreviewDto> PreviewAsync(string projectId, PlacementPreviewQuery query)
    {
        var scope = new ProjectScope(_db, projectId);
        var input = new PlanInput(
            Id(query.MotherPlantId), Id(query.FatherPlantId), query.LineId, query.StartNewLine, query.NewLineName,
            InputRules.ValidateSeason(query.Season), InputRules.ValidateYear(query.Year), query.FieldId, query.PopulationId);

        // Nothing here saves or adds: no row, no counter change, no
        // population created or adopted.
        var plan = await PlanAsync(scope, input, track: false);
        var placement = plan.Placement;

        string code;
        bool isFounders;
        int startSeq;
        if (plan.Line is not null)
        {
            code = plan.Line.Code;
            isFounders = plan.Line.IsFounders;
            startSeq = plan.Line.NextSeq;
        }
        else
        {
            code = LineCodes.From(placement.NewLineName, await TakenCodesAsync(projectId));
            isFounders = false;
            startSeq = 1;
        }

        var taken = await TakenTagsAsync(projectId, code);
        var (tag, _) = TagFormatter.NextFree(code, isFounders, placement.Kind, placement.Generation, startSeq, taken.Contains);

        var plantCount = plan.Population is null
            ? 0
            : await _db.ProjectItems.CountAsync(i => i.ProjectId == projectId && i.PopulationId == plan.Population.Id);

        return new PlacementPreviewDto
        {
            IsSelf = placement.IsSelf,
            StartsNewLine = placement.StartsNewLine,
            ForcedNewLine = placement.ForcedNewLine,
            AllowedLineChoices = placement.Choices
                .Select(c => new LineChoiceDto { LineId = c.LineId, Name = c.Name, IsNew = c.IsNew }).ToList(),
            Line = new PreviewLineDto { Id = plan.Line?.Id, Name = plan.Line?.Name ?? placement.NewLineName ?? string.Empty },
            Label = TagFormatter.Label(placement.Kind, placement.Generation),
            SuggestedTag = tag,
            Population = new PreviewPopulationDto
            {
                Action = plan.Population is null ? "creates" : "joins",
                Name = PopulationNames.Name(plan.Season, plan.Year, plan.FieldName),
                PlantCount = plantCount,
            },
        };
    }

    // ---- create ----

    public Task<CreatePlantsResponse> CreateAsync(string projectId, CreatePlantsRequest request)
    {
        if (request.Count < 1 || request.Count > MaxCount)
        {
            throw new PedigreeException("count", PedigreeCodes.InvalidInput, "Count must be between 1 and 500.");
        }

        var customTag = string.IsNullOrWhiteSpace(request.Tag) ? null : InputRules.ValidateTag(request.Tag.Trim());
        if (customTag is not null && request.Count != 1)
        {
            throw new PedigreeException("count", PedigreeCodes.InvalidInput, "A custom tag works for one plant at a time.");
        }

        var input = new PlanInput(
            Id(request.MotherPlantId), Id(request.FatherPlantId), request.LineId, request.StartNewLine, request.NewLineName,
            InputRules.ValidateSeason(request.Season), InputRules.ValidateYear(request.Year), request.FieldId, request.PopulationId);
        var traits = (
            FruitColor: InputRules.NormalizeTrait("fruitColor", request.FruitColor),
            FruitWeight: InputRules.NormalizeTrait("fruitWeight", request.FruitWeight),
            SeedColor: InputRules.NormalizeTrait("seedColor", request.SeedColor),
            SeedWeight: InputRules.NormalizeTrait("seedWeight", request.SeedWeight));

        // A lost race on the line's tag counter or on a unique index retries
        // from scratch; the fixed-text 409 is the last resort.
        return ServiceWrites.RunAsync(_db, TagRetries, ServiceWrites.WriteConflict, async () =>
        {
            var scope = new ProjectScope(_db, projectId);
            var plan = await PlanAsync(scope, input, track: true);
            var placement = plan.Placement;

            var existing = await _db.ProjectItems.CountAsync(i => i.ProjectId == projectId);
            if (existing + request.Count > _options.MaxPlantsPerProject)
            {
                throw Quota($"This project is at its limit of {_options.MaxPlantsPerProject} plants.");
            }
            await EnsureStructureQuotaAsync(projectId, plan);

            if (customTag is not null && await TagExistsAsync(projectId, customTag))
            {
                throw PedigreeException.Conflict(PedigreeFields.Tag, PedigreeCodes.TagTaken,
                    $"The tag {customTag} is already used in this project.");
            }

            var (line, population) = Materialize(projectId, plan,
                plan.Line is null ? await TakenCodesAsync(projectId) : Array.Empty<string>());

            var taken = await TakenTagsAsync(projectId, line.Code);
            var seq = line.NextSeq;
            var now = DateTime.UtcNow;
            var created = new List<ProjectItem>(request.Count);
            for (var n = 0; n < request.Count; n++)
            {
                string tag;
                if (customTag is not null)
                {
                    tag = customTag;
                }
                else
                {
                    var next = TagFormatter.NextFree(line.Code, line.IsFounders, placement.Kind, placement.Generation, seq, taken.Contains);
                    tag = next.Tag;
                    seq = next.Seq + 1;
                    taken.Add(tag);
                }

                created.Add(new ProjectItem
                {
                    PlantId = Guid.NewGuid().ToString("N"),
                    ProjectId = projectId,
                    Tag = tag,
                    Population = population,
                    MotherPlantId = plan.Mother?.PlantId,
                    FatherPlantId = plan.Father?.PlantId,
                    FruitColor = traits.FruitColor,
                    FruitWeight = traits.FruitWeight,
                    SeedColor = traits.SeedColor,
                    SeedWeight = traits.SeedWeight,
                    RowVersion = 1,
                    CreatedAt = now,
                });
            }

            if (customTag is null) line.NextSeq = seq;
            _db.ProjectItems.AddRange(created);
            await TouchProjectAsync(projectId, now);
            await _db.SaveChangesAsync();

            // Built from what was just written: no re-read of the new plants and
            // no lookup of parents or children (a new plant has none).
            ParentRefDto? ParentRef(ParentInfo? parent) =>
                parent is null ? null : new ParentRefDto { PlantId = parent.PlantId, Tag = parent.Tag, Removed = false };
            var plants = created.Select(c => new PlantDto
            {
                PlantId = c.PlantId,
                Tag = c.Tag,
                ProjectId = projectId,
                LineId = line.Id,
                PopulationId = population.Id,
                Kind = population.Kind?.ToString(),
                Generation = population.Generation ?? 0,
                Label = LabelOf(population),
                Mother = ParentRef(plan.Mother),
                Father = ParentRef(plan.Father),
                IsSelf = plan.Mother is not null && plan.Mother.PlantId == plan.Father?.PlantId,
                FruitColor = c.FruitColor,
                FruitWeight = c.FruitWeight,
                SeedColor = c.SeedColor,
                SeedWeight = c.SeedWeight,
                ChildCount = 0,
                Version = c.RowVersion,
                CreatedAt = c.CreatedAt,
            }).ToList();
            return new CreatePlantsResponse
            {
                Plants = plants,
                Line = (await _lines.GetLineAsync(projectId, line.Id))!,
            };
        });
    }

    // ---- update traits ----

    public async Task<PlantDto?> UpdateTraitsAsync(string projectId, string plantId, UpdatePlantRequest request)
    {
        var scope = new ProjectScope(_db, projectId);
        var plant = await scope.FindPlantAsync(plantId, track: true);
        if (plant is null) return null;

        // State check after ownership and existence, before the input rules.
        if (plant.RowVersion != request.Version) throw ServiceWrites.VersionConflict();

        // Only the four trait fields exist on the request; a null leaves the
        // trait as it is, blank text clears it.
        var fruitColor = request.FruitColor is null ? null : new Change(InputRules.NormalizeTrait("fruitColor", request.FruitColor));
        var fruitWeight = request.FruitWeight is null ? null : new Change(InputRules.NormalizeTrait("fruitWeight", request.FruitWeight));
        var seedColor = request.SeedColor is null ? null : new Change(InputRules.NormalizeTrait("seedColor", request.SeedColor));
        var seedWeight = request.SeedWeight is null ? null : new Change(InputRules.NormalizeTrait("seedWeight", request.SeedWeight));

        await ServiceWrites.RunAsync(_db, 1, ServiceWrites.VersionConflict, async () =>
        {
            if (fruitColor is not null) plant.FruitColor = fruitColor.Value;
            if (fruitWeight is not null) plant.FruitWeight = fruitWeight.Value;
            if (seedColor is not null) plant.SeedColor = seedColor.Value;
            if (seedWeight is not null) plant.SeedWeight = seedWeight.Value;
            Bump(plant, request.Version);
            await TouchProjectAsync(projectId, DateTime.UtcNow);
            await _db.SaveChangesAsync();
            return true;
        });

        return await GetPlantAsync(projectId, plantId);
    }

    private sealed record Change(string? Value);

    // The version goes up once per write. The client's version is the
    // original value, so a stale or forged one fails at the database too.
    private void Bump(ProjectItem plant, int clientVersion)
    {
        _db.Entry(plant).Property(p => p.RowVersion).OriginalValue = clientVersion;
        plant.RowVersion = clientVersion + 1;
    }

    // ---- update parents ----

    public async Task<UpdateParentsResponse?> UpdateParentsAsync(string projectId, string plantId, UpdateParentsRequest request)
    {
        var scope = new ProjectScope(_db, projectId);
        var plant = await scope.FindPlantAsync(plantId, track: true);
        if (plant is null) return null;
        if (plant.RowVersion != request.Version) throw ServiceWrites.VersionConflict();

        var current = await scope.FindPopulationAsync(plant.PopulationId, track: true)
            ?? throw PedigreeException.PopulationNotFound();
        var currentLine = await scope.RequireLineAsync(current.LineId);

        var previousLabel = LabelOf(current);
        var previousLineId = current.LineId;
        var previousPopulationId = current.Id;
        var previousMother = plant.MotherPlantId;
        var previousFather = plant.FatherPlantId;

        var input = new PlanInput(
            Id(request.MotherPlantId), Id(request.FatherPlantId), request.LineId, request.StartNewLine, request.NewLineName,
            current.Season, current.Year, current.FieldId, null, plantId, currentLine.IsFounders);

        var descendants = 0;
        var response = await ServiceWrites.RunAsync(_db, 1, ServiceWrites.VersionConflict, async () =>
        {
            var plan = await PlanAsync(scope, input, track: true);

            var edges = await scope.LoadParentEdgesAsync();
            PedigreeRules.EnsureNotDescendant(plantId, plan.Mother!, plan.Father!, edges,
                _options.MaxAncestorDepth, _options.MaxAncestorNodes);
            descendants = CountDescendants(edges, plantId);

            await EnsureStructureQuotaAsync(projectId, plan);
            var (line, population) = Materialize(projectId, plan,
                plan.Line is null ? await TakenCodesAsync(projectId) : Array.Empty<string>());

            // The tag never changes; only parents, placement and version do.
            plant.Population = population;
            plant.MotherPlantId = plan.Mother!.PlantId;
            plant.FatherPlantId = plan.Father!.PlantId;
            plant.MotherRemovedTag = null;
            plant.FatherRemovedTag = null;
            Bump(plant, request.Version);
            await TouchProjectAsync(projectId, DateTime.UtcNow);
            await _db.SaveChangesAsync();
            return line.Id;
        });

        return new UpdateParentsResponse
        {
            Plant = (await GetPlantAsync(projectId, plantId))!,
            PreviousLabel = previousLabel,
            PreviousLineId = previousLineId,
            PreviousPopulationId = previousPopulationId,
            PreviousMotherPlantId = previousMother,
            PreviousFatherPlantId = previousFather,
            DescendantCount = descendants,
            Line = (await _lines.GetLineAsync(projectId, response))!,
        };
    }

    // All plants below `plantId`, counted over the project's own edges.
    private static int CountDescendants(IReadOnlyDictionary<string, AncestorWalk.Edge> edges, string plantId)
    {
        var children = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        foreach (var (id, edge) in edges)
        {
            foreach (var parent in new[] { edge.Mother, edge.Father }.Where(p => p is not null).Distinct())
            {
                if (!children.TryGetValue(parent!, out var list)) children[parent!] = list = new List<string>();
                list.Add(id);
            }
        }

        var seen = new HashSet<string>(StringComparer.Ordinal) { plantId };
        var queue = new Queue<string>();
        queue.Enqueue(plantId);
        while (queue.Count > 0)
        {
            if (!children.TryGetValue(queue.Dequeue(), out var kids)) continue;
            foreach (var kid in kids)
            {
                if (seen.Add(kid)) queue.Enqueue(kid);
            }
        }

        return seen.Count - 1;
    }

    // ---- delete ----

    public async Task<DeletePlantResult> DeleteAsync(string projectId, string plantId, bool confirm)
    {
        var scope = new ProjectScope(_db, projectId);
        var plant = await scope.FindPlantAsync(plantId, track: true);
        if (plant is null) return new DeletePlantResult(DeletePlantStatus.NotFound, 0);

        // Children are looked up inside this project only.
        var children = await _db.ProjectItems
            .Where(i => i.ProjectId == projectId && i.PlantId != plantId
                && (i.MotherPlantId == plantId || i.FatherPlantId == plantId))
            .ToListAsync();
        if (children.Count > 0 && !confirm)
        {
            return new DeletePlantResult(DeletePlantStatus.HasChildren, children.Count);
        }

        await ServiceWrites.RunAsync(_db, 1, ServiceWrites.WriteConflict, async () =>
        {
            // One SaveChanges: the children lose the link and keep the tag it
            // had, then the plant goes. Empty populations stay.
            foreach (var child in children)
            {
                if (child.MotherPlantId == plantId)
                {
                    child.MotherPlantId = null;
                    child.MotherRemovedTag = plant.Tag;
                }
                if (child.FatherPlantId == plantId)
                {
                    child.FatherPlantId = null;
                    child.FatherRemovedTag = plant.Tag;
                }
                child.RowVersion++;
            }

            _db.ProjectItems.Remove(plant);
            await TouchProjectAsync(projectId, DateTime.UtcNow);
            await _db.SaveChangesAsync();
            return true;
        });

        return new DeletePlantResult(DeletePlantStatus.Deleted, children.Count);
    }

    // ---- planning (shared by preview, create and edit parents) ----

    private sealed record PlanInput(
        string? MotherId, string? FatherId, int? LineId, bool StartNewLine, string? NewLineName,
        string? Season, short? Year, int? FieldId, int? PopulationId,
        string? EditingPlantId = null, bool EditingInFounders = false);

    private sealed class Plan
    {
        public PlacementResult Placement { get; init; } = null!;
        public ParentInfo? Mother { get; init; }
        public ParentInfo? Father { get; init; }

        // The existing target line, or null when the placement starts a new one.
        public Line? Line { get; init; }

        // The existing population to join (or an empty placeholder to adopt).
        public Population? Population { get; init; }
        public string? Season { get; init; }
        public short? Year { get; init; }
        public int? FieldId { get; init; }
        public string? FieldName { get; init; }
    }

    private async Task<Plan> PlanAsync(ProjectScope scope, PlanInput input, bool track)
    {
        var projectId = scope.ProjectId;

        // A name that was sent is checked even when the plan ends up joining a
        // sibling line and does not use it.
        if (!string.IsNullOrWhiteSpace(input.NewLineName)) InputRules.ValidateLineName(input.NewLineName);

        // Every id is looked up with the project: a foreign id and an unknown
        // id give the same answer.
        var field = input.FieldId is null ? null : await scope.RequireFieldAsync(input.FieldId);
        var requested = input.PopulationId is null ? null : await scope.RequirePopulationAsync(input.PopulationId, track);

        var lines = await LineInfoLoader.LoadAsync(_db, projectId);
        var mother = await ResolveParentAsync(scope, input.MotherId);
        var father = await ResolveParentAsync(scope, input.FatherId);

        var siblings = await FindSiblingsAsync(projectId, mother, father, lines, input.EditingPlantId);

        var placement = PedigreeRules.Place(
            new PlacementRequest(input.MotherId, input.FatherId, mother, father, input.LineId, input.StartNewLine,
                input.NewLineName, input.EditingPlantId, input.EditingInFounders, siblings),
            lines);

        Line? line = null;
        Population? population = null;
        var season = input.Season;
        var year = input.Year;
        var fieldId = field?.Id;

        if (placement.LineId is { } lineId)
        {
            line = await scope.RequireLineAsync(lineId, track);
            char kind = placement.Kind;

            if (requested is not null && requested.LineId == line.Id
                && (requested.Kind is null || (requested.Kind == kind && requested.Generation == placement.Generation)))
            {
                population = requested;
            }
            else
            {
                population = await FindPopulationAsync(projectId, line.Id, kind, placement.Generation, season, year, fieldId, track)
                    ?? await FindPopulationAsync(projectId, line.Id, null, null, season, year, fieldId, track);
            }

            if (population is not null)
            {
                season = population.Season;
                year = population.Year;
                fieldId = population.FieldId;
            }
        }

        string? fieldName = fieldId is null ? null
            : field is not null && field.Id == fieldId ? field.Name
            : (await scope.FindFieldAsync(fieldId))?.Name;

        return new Plan
        {
            Placement = placement,
            Mother = mother,
            Father = father,
            Line = line,
            Population = population,
            Season = season,
            Year = year,
            FieldId = fieldId,
            FieldName = fieldName,
        };
    }

    // Lines that already hold this cross (design section 2, "Sibling lines").
    // Project-scoped queries only; a same-line pair needs none of this.
    private async Task<IReadOnlyList<SiblingCandidate>> FindSiblingsAsync(
        string projectId, ParentInfo? mother, ParentInfo? father, Dictionary<int, LineInfo> lines, string? editingPlantId)
    {
        if (mother is null || father is null) return Array.Empty<SiblingCandidate>();
        if (!lines.TryGetValue(mother.LineId, out var motherLine) || !lines.TryGetValue(father.LineId, out var fatherLine))
        {
            return Array.Empty<SiblingCandidate>();
        }
        if (!motherLine.IsFounders && !fatherLine.IsFounders && mother.LineId == father.LineId) return Array.Empty<SiblingCandidate>();

        var key = PairKey.Of(
            SiblingLines.KeyOf(motherLine.IsFounders, mother.LineId, mother.Label, mother.Tag),
            SiblingLines.KeyOf(fatherLine.IsFounders, father.LineId, father.Label, father.Tag),
            mother.PlantId == father.PlantId);

        var origins = (await _db.LineOrigins.AsNoTracking()
                .Where(o => o.Line.ProjectId == projectId && o.Role != LineOrigin.RoleForkedFrom)
                .Select(o => new { o.LineId, o.Role, o.SourceLineId, o.SourceLabel, o.SourcePlantTag })
                .ToListAsync())
            .Select(o => new SiblingOriginRow(o.LineId, o.Role, o.SourceLineId, o.SourceLabel, o.SourcePlantTag));

        var populations = await _db.Populations.AsNoTracking()
            .Where(p => p.ProjectId == projectId && p.Kind != null && p.Generation != null)
            .Select(p => new { p.Id, p.LineId, Kind = p.Kind!.Value, Generation = p.Generation!.Value })
            .ToDictionaryAsync(p => p.Id);
        var plants = (await _db.ProjectItems.AsNoTracking()
                .Where(i => i.ProjectId == projectId)
                .Select(i => new { i.PlantId, i.Tag, i.PopulationId, i.MotherPlantId, i.FatherPlantId })
                .ToListAsync())
            .Where(i => populations.ContainsKey(i.PopulationId))
            .Select(i =>
            {
                var p = populations[i.PopulationId];
                return new SiblingPlantRow(i.PlantId, i.Tag, p.LineId, p.Generation, TagFormatter.Label(p.Kind, p.Generation), i.MotherPlantId, i.FatherPlantId);
            });

        return SiblingLines.Find(key, lines, origins, plants, editingPlantId);
    }

    private async Task<ParentInfo?> ResolveParentAsync(ProjectScope scope, string? plantId)
    {
        var plant = await scope.FindPlantAsync(plantId);
        if (plant is null) return null;
        var population = await scope.FindPopulationAsync(plant.PopulationId);
        if (population is null) return null;
        return new ParentInfo(plant.PlantId, plant.Tag, population.LineId, population.Generation ?? 0, LabelOf(population));
    }

    private Task<Population?> FindPopulationAsync(
        string projectId, int lineId, char? kind, int? generation, string? season, short? year, int? fieldId, bool track)
    {
        var query = track ? _db.Populations : _db.Populations.AsNoTracking();
        return query
            .Where(p => p.ProjectId == projectId && p.LineId == lineId && p.Kind == kind && p.Generation == generation
                && p.Season == season && p.Year == year && p.FieldId == fieldId)
            .OrderBy(p => p.Id)
            .FirstOrDefaultAsync();
    }

    // Adds what the plan needs that does not exist yet (a new line with its
    // origin rows, a population, or fills an empty one). The project always
    // comes from the plan's own project, never from a request.
    private (Line Line, Population Population) Materialize(string projectId, Plan plan, IEnumerable<string> takenCodes)
    {
        var placement = plan.Placement;
        var line = plan.Line;
        if (line is null)
        {
            line = new Line
            {
                ProjectId = projectId,
                Name = placement.NewLineName!,
                Code = LineCodes.From(placement.NewLineName, takenCodes),
            };
            _db.Lines.Add(line);
        }

        foreach (var origin in placement.Origins)
        {
            _db.LineOrigins.Add(new LineOrigin
            {
                Line = line,
                Role = origin.Role,
                SourceLineId = origin.SourceLineId,
                SourceLineName = origin.SourceLineName,
                SourceLabel = origin.SourceLabel,
                SourcePlantTag = origin.SourcePlantTag,
            });
        }

        var population = plan.Population;
        if (population is null)
        {
            population = new Population
            {
                ProjectId = projectId,
                Line = line,
                Kind = placement.Kind,
                Generation = placement.Generation,
                Season = plan.Season,
                Year = plan.Year,
                FieldId = plan.FieldId,
            };
            _db.Populations.Add(population);
        }
        else if (population.Kind is null)
        {
            population.Kind = placement.Kind;
            population.Generation = placement.Generation;
        }

        return (line, population);
    }

    private async Task EnsureStructureQuotaAsync(string projectId, Plan plan)
    {
        if (plan.Line is null)
        {
            if (await _db.Lines.CountAsync(l => l.ProjectId == projectId) >= _options.MaxLinesPerProject)
            {
                throw Quota($"This project is at its limit of {_options.MaxLinesPerProject} lines.");
            }
        }
        else if (plan.Population is null
            && await _db.Populations.CountAsync(p => p.ProjectId == projectId && p.LineId == plan.Line.Id) >= _options.MaxPopulationsPerLine)
        {
            throw Quota($"This line is at its limit of {_options.MaxPopulationsPerLine} populations.");
        }
    }

    private static PedigreeException Quota(string message) =>
        new(null, PedigreeCodes.QuotaExceeded, message);

    // ---- helpers ----

    private static string? Id(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string LabelOf(Population population) =>
        TagFormatter.Label(population.Kind ?? 'F', population.Generation ?? 0);

    private Task<bool> TagExistsAsync(string projectId, string tag)
    {
        var lower = tag.ToLower();
        return _db.ProjectItems.AnyAsync(i => i.ProjectId == projectId && i.Tag.ToLower() == lower);
    }

    // Tags in this project that start with the line code (a custom tag can
    // look generated, so generation skips these).
    private async Task<HashSet<string>> TakenTagsAsync(string projectId, string lineCode)
    {
        var prefix = lineCode + "-";
        var tags = await _db.ProjectItems.AsNoTracking()
            .Where(i => i.ProjectId == projectId && i.Tag.StartsWith(prefix))
            .Select(i => i.Tag)
            .ToListAsync();
        return new HashSet<string>(tags, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<List<string>> TakenCodesAsync(string projectId) =>
        await _db.Lines.AsNoTracking().Where(l => l.ProjectId == projectId).Select(l => l.Code).ToListAsync();

    private async Task TouchProjectAsync(string projectId, DateTime now)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId);
        if (project is not null) project.LastUpdate = now;
    }

    private async Task<List<PlantDto>> LoadDtosAsync(string projectId, IReadOnlyCollection<string> plantIds)
    {
        var plants = await _db.ProjectItems.AsNoTracking()
            .Include(i => i.Population)
            .Where(i => i.ProjectId == projectId && plantIds.Contains(i.PlantId))
            .OrderBy(i => i.Tag)
            .ToListAsync();
        return await ToDtosAsync(projectId, plants);
    }

    // Parent tags and child counts come from two queries for the whole page.
    private async Task<List<PlantDto>> ToDtosAsync(string projectId, IReadOnlyList<ProjectItem> items)
    {
        if (items.Count == 0) return new List<PlantDto>();

        var parentIds = items
            .SelectMany(i => new[] { i.MotherPlantId, i.FatherPlantId })
            .Where(id => id is not null).Select(id => id!).Distinct().ToList();
        var parentTags = parentIds.Count == 0
            ? new Dictionary<string, string>()
            : await _db.ProjectItems.AsNoTracking()
                .Where(i => i.ProjectId == projectId && parentIds.Contains(i.PlantId))
                .ToDictionaryAsync(i => i.PlantId, i => i.Tag);

        var ids = items.Select(i => i.PlantId).ToList();
        // Two simple queries, one per parent index, instead of one OR.
        var byMother = await _db.ProjectItems.AsNoTracking()
            .Where(i => i.ProjectId == projectId && ids.Contains(i.MotherPlantId!))
            .Select(i => new { i.PlantId, i.MotherPlantId, i.FatherPlantId })
            .ToListAsync();
        var byFather = await _db.ProjectItems.AsNoTracking()
            .Where(i => i.ProjectId == projectId && ids.Contains(i.FatherPlantId!))
            .Select(i => new { i.PlantId, i.MotherPlantId, i.FatherPlantId })
            .ToListAsync();
        var childRows = byMother.Concat(byFather).DistinctBy(r => r.PlantId).ToList();
        var childCounts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var row in childRows)
        {
            foreach (var parent in new[] { row.MotherPlantId, row.FatherPlantId }.Where(p => p is not null).Distinct())
            {
                childCounts[parent!] = childCounts.GetValueOrDefault(parent!) + 1;
            }
        }

        ParentRefDto? Ref(string? id, string? removedTag) =>
            id is not null
                ? new ParentRefDto { PlantId = id, Tag = parentTags.GetValueOrDefault(id) ?? "(unknown)", Removed = false }
                : removedTag is not null
                    ? new ParentRefDto { PlantId = null, Tag = removedTag, Removed = true }
                    : null;

        return items.Select(i => new PlantDto
        {
            PlantId = i.PlantId,
            Tag = i.Tag,
            ProjectId = i.ProjectId,
            LineId = i.Population.LineId,
            PopulationId = i.PopulationId,
            Kind = i.Population.Kind?.ToString(),
            Generation = i.Population.Generation ?? 0,
            Label = LabelOf(i.Population),
            Mother = Ref(i.MotherPlantId, i.MotherRemovedTag),
            Father = Ref(i.FatherPlantId, i.FatherRemovedTag),
            IsSelf = i.MotherPlantId is not null && i.MotherPlantId == i.FatherPlantId,
            FruitColor = i.FruitColor,
            FruitWeight = i.FruitWeight,
            SeedColor = i.SeedColor,
            SeedWeight = i.SeedWeight,
            ChildCount = childCounts.GetValueOrDefault(i.PlantId),
            Version = i.RowVersion,
            CreatedAt = i.CreatedAt,
        }).ToList();
    }
}
