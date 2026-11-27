namespace SeedsBank.Server.Services.Pedigree;

// A line as the rules see it (no entity, no database).
public sealed record LineInfo(
    int Id,
    string Name,
    bool IsFounders,
    int? SuccessorLineId,
    int? ForkedFromLineId,
    bool HasPlants,
    bool HasOrigin);

// A parent plant already resolved inside the project (null when it is not
// one of this project's plants).
public sealed record ParentInfo(string PlantId, string Tag, int LineId, int Generation, string Label);

public sealed record PlacementRequest(
    string? MotherId,
    string? FatherId,
    ParentInfo? Mother,
    ParentInfo? Father,
    int? LineId,
    bool StartNewLine,
    string? NewLineName,
    // Edit only: the plant whose parents change.
    string? EditingPlantId = null,
    bool EditingPlantInFounders = false,
    // Lines that already hold this cross (SiblingLines.Find), oldest first.
    // Ignored for a same-line pair.
    IReadOnlyList<SiblingCandidate>? Siblings = null);

public sealed record OriginSeed(string Role, int? SourceLineId, string SourceLineName, string SourceLabel, string? SourcePlantTag);

public sealed record LineChoice(int? LineId, string Name, bool IsNew);

// What the server decided. LineId is null when a new line must be created
// (then NewLineName is its name). The population (season, place) is the
// service's job; this only fixes line, kind and generation.
public sealed record PlacementResult(
    int? LineId,
    bool StartsNewLine,
    string? NewLineName,
    char Kind,
    int Generation,
    bool IsSelf,
    bool ForcedNewLine,
    IReadOnlyList<OriginSeed> Origins,
    IReadOnlyList<LineChoice> Choices);

// Placement and validation for a plant and its parents (design section 2).
// Used by create, edit-parents and preview. Pure: no database, no clock.
public static class PedigreeRules
{
    public static PlacementResult Place(PlacementRequest req, IReadOnlyDictionary<int, LineInfo> lines)
    {
        var founders = lines.Values.FirstOrDefault(l => l.IsFounders);
        var isEdit = req.EditingPlantId is not null;
        var hasMother = !string.IsNullOrWhiteSpace(req.MotherId);
        var hasFather = !string.IsNullOrWhiteSpace(req.FatherId);

        if (req.EditingPlantInFounders)
        {
            throw new PedigreeException(PedigreeFields.Mother, PedigreeCodes.FounderNoParents,
                "Founders have no parents. To use one as a parent, cross or self it.");
        }

        if (!hasMother && !hasFather)
        {
            if (isEdit)
            {
                throw new PedigreeException(PedigreeFields.Mother, PedigreeCodes.ParentsRequired,
                    "Pick both parents.");
            }

            if (req.StartNewLine || (req.LineId is not null && req.LineId != founders?.Id))
            {
                throw new PedigreeException(PedigreeFields.Line, PedigreeCodes.NoParentsFoundersOnly,
                    "A plant with no parents belongs to Founders.");
            }

            if (founders is null) throw PedigreeException.LineNotFound();

            return new PlacementResult(founders.Id, false, null, 'P', 0, false, false,
                Array.Empty<OriginSeed>(), Array.Empty<LineChoice>());
        }

        if (hasMother != hasFather)
        {
            throw new PedigreeException(hasMother ? PedigreeFields.Father : PedigreeFields.Mother,
                PedigreeCodes.OneParent, "Pick both parents, or leave both empty for a founder.");
        }

        if (isEdit)
        {
            if (string.Equals(req.MotherId, req.EditingPlantId, StringComparison.Ordinal))
            {
                throw OwnParent(PedigreeFields.Mother);
            }
            if (string.Equals(req.FatherId, req.EditingPlantId, StringComparison.Ordinal))
            {
                throw OwnParent(PedigreeFields.Father);
            }
        }

        var mother = req.Mother ?? throw PedigreeException.ParentNotFound(PedigreeFields.Mother, req.MotherId);
        var father = req.Father ?? throw PedigreeException.ParentNotFound(PedigreeFields.Father, req.FatherId);

        if (req.StartNewLine && req.LineId is not null)
        {
            throw new PedigreeException(PedigreeFields.Line, PedigreeCodes.LineConflict,
                "Choose an existing line or start a new one, not both.");
        }

        var motherLine = lines.GetValueOrDefault(mother.LineId) ?? throw PedigreeException.LineNotFound();
        var fatherLine = lines.GetValueOrDefault(father.LineId) ?? throw PedigreeException.LineNotFound();

        var isSelf = string.Equals(mother.PlantId, father.PlantId, StringComparison.Ordinal);
        var kind = isSelf ? 'S' : 'F';
        var maxGeneration = Math.Max(mother.Generation, father.Generation);

        var groups = LineGroups.Build(lines);
        var anyFounder = motherLine.IsFounders || fatherLine.IsFounders;
        var sameLine = !anyFounder && groups[motherLine.Id] == groups[fatherLine.Id];

        // End of the chain, counted from the parent with the higher generation
        // (ties: the mother).
        var chainLine = father.Generation > mother.Generation ? fatherLine : motherLine;
        var endOfChain = sameLine ? LineGroups.EndOfChain(chainLine.Id, lines) : null;

        var siblings = sameLine
            ? Array.Empty<SiblingCandidate>()
            : (req.Siblings ?? Array.Empty<SiblingCandidate>())
                .Where(c => lines.TryGetValue(c.LineId, out var l) && !l.IsFounders)
                .OrderBy(c => c.LineId).ToArray();

        var choices = BuildChoices(sameLine, endOfChain, groups, motherLine, lines, siblings);
        var origins = OriginsFor(mother, father, motherLine, fatherLine);

        if (req.LineId is { } explicitId)
        {
            var target = lines.GetValueOrDefault(explicitId) ?? throw PedigreeException.LineNotFound();

            if (!target.IsFounders && sameLine && groups[target.Id] == groups[motherLine.Id])
            {
                return new PlacementResult(target.Id, false, null, kind, maxGeneration + 1, isSelf, false,
                    Array.Empty<OriginSeed>(), choices);
            }

            if (siblings.FirstOrDefault(c => c.LineId == target.Id) is { } sibling)
            {
                return new PlacementResult(target.Id, false, null, kind, sibling.Generation, isSelf, false,
                    Array.Empty<OriginSeed>(), choices);
            }

            if (!target.IsFounders && !target.HasPlants)
            {
                return new PlacementResult(target.Id, false, null, kind, 1, isSelf, false,
                    target.HasOrigin ? Array.Empty<OriginSeed>() : origins, choices);
            }

            throw new PedigreeException(PedigreeFields.Line, PedigreeCodes.LineNotAllowed,
                "That line is not one of the parents' lines.");
        }

        if (!sameLine && !req.StartNewLine && siblings.Length > 0)
        {
            // The same cross again: the oldest sibling line, at its generation.
            return new PlacementResult(siblings[0].LineId, false, null, kind, siblings[0].Generation, isSelf, false,
                Array.Empty<OriginSeed>(), choices);
        }

        if (!sameLine || req.StartNewLine)
        {
            var name = ResolveNewLineName(req.NewLineName, mother, father, isSelf, lines);
            return new PlacementResult(null, true, name, kind, 1, isSelf, !sameLine && siblings.Length == 0, origins, choices);
        }

        return new PlacementResult(endOfChain!.Id, false, null, kind, maxGeneration + 1, isSelf, false,
            Array.Empty<OriginSeed>(), choices);
    }

    // Edit only: the new parents must not be descendants of the plant (that
    // would make a loop). Walks over the project's edges; fails closed.
    public static void EnsureNotDescendant(
        string plantId,
        ParentInfo mother,
        ParentInfo father,
        IReadOnlyDictionary<string, AncestorWalk.Edge> edges,
        int maxDepth,
        int maxNodes)
    {
        if (AncestorWalk.Reaches(edges, mother.PlantId, plantId, maxDepth, maxNodes))
        {
            throw Descendant(PedigreeFields.Mother, mother.Tag);
        }
        if (AncestorWalk.Reaches(edges, father.PlantId, plantId, maxDepth, maxNodes))
        {
            throw Descendant(PedigreeFields.Father, father.Tag);
        }
    }

    private static PedigreeException OwnParent(string field) =>
        new(field, PedigreeCodes.OwnParent, "A plant cannot be its own mother or father.");

    private static PedigreeException Descendant(string field, string tag) =>
        new(field, PedigreeCodes.DescendantParent,
            $"{tag} is a descendant of this plant, so it cannot be its parent.");

    private static IReadOnlyList<OriginSeed> OriginsFor(
        ParentInfo mother, ParentInfo father, LineInfo motherLine, LineInfo fatherLine) => new[]
    {
        new OriginSeed(Models.LineOrigin.RoleMother, motherLine.Id, motherLine.Name, mother.Label, mother.Tag),
        new OriginSeed(Models.LineOrigin.RoleFather, fatherLine.Id, fatherLine.Name, father.Label, father.Tag),
    };

    // An explicit name that is taken is a 409. A missing name gets a default
    // built from the parents' tags ("A x B", "A selfed"), cleaned to the line
    // name rules, cut to the length cap and made unique with " 2", " 3"...
    // so a default never conflicts (preview included).
    private static string ResolveNewLineName(
        string? requested, ParentInfo mother, ParentInfo father, bool isSelf,
        IReadOnlyDictionary<int, LineInfo> lines)
    {
        var taken = new HashSet<string>(lines.Values.Select(l => l.Name), StringComparer.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(requested))
        {
            var name = InputRules.ValidateLineName(requested);
            if (taken.Contains(name))
            {
                throw PedigreeException.Conflict(PedigreeFields.LineName, PedigreeCodes.LineNameTaken,
                    $"A line named {name} already exists in this project.");
            }
            return name;
        }

        var baseName = Clean(isSelf ? $"{mother.Tag} selfed" : $"{mother.Tag} x {father.Tag}");
        var candidate = baseName;
        for (var n = 2; taken.Contains(candidate); n++)
        {
            var suffix = " " + n;
            var head = baseName.Length + suffix.Length > InputRules.MaxLineNameLength
                ? baseName[..(InputRules.MaxLineNameLength - suffix.Length)].TrimEnd()
                : baseName;
            candidate = head + suffix;
        }
        return candidate;
    }

    private static string Clean(string text)
    {
        var chars = text.Select(c => char.IsLetterOrDigit(c) || c == ' ' || c == '-' ? c : '-').ToArray();
        var cleaned = new string(chars).Trim();
        if (cleaned.Length > InputRules.MaxLineNameLength) cleaned = cleaned[..InputRules.MaxLineNameLength].TrimEnd();
        return cleaned.Length == 0 ? "New line" : cleaned;
    }

    private static IReadOnlyList<LineChoice> BuildChoices(
        bool sameLine, LineInfo? endOfChain, IReadOnlyDictionary<int, int> groups,
        LineInfo motherLine, IReadOnlyDictionary<int, LineInfo> lines, IReadOnlyList<SiblingCandidate> siblings)
    {
        if (!sameLine || endOfChain is null)
        {
            var list = siblings.Select(c => new LineChoice(c.LineId, lines[c.LineId].Name, false)).ToList();
            list.Add(new LineChoice(null, string.Empty, true));
            return list;
        }

        var choices = new List<LineChoice> { new(endOfChain.Id, endOfChain.Name, false) };
        choices.AddRange(lines.Values
            .Where(l => l.Id != endOfChain.Id && !l.IsFounders && groups[l.Id] == groups[motherLine.Id])
            .OrderBy(l => l.Id)
            .Select(l => new LineChoice(l.Id, l.Name, false)));
        choices.Add(new LineChoice(null, string.Empty, true));
        return choices;
    }
}

// Rename chains: two lines are one "line" for placement when they are linked
// by a successor or a forked-from edge, directly or through other lines.
public static class LineGroups
{
    public static Dictionary<int, int> Build(IReadOnlyDictionary<int, LineInfo> lines)
    {
        var parent = lines.Keys.ToDictionary(id => id, id => id);

        int Find(int x)
        {
            while (parent[x] != x)
            {
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;
        }

        void Union(int a, int b)
        {
            if (!parent.ContainsKey(a) || !parent.ContainsKey(b)) return;
            parent[Find(a)] = Find(b);
        }

        foreach (var line in lines.Values)
        {
            if (line.SuccessorLineId is { } s) Union(line.Id, s);
            if (line.ForkedFromLineId is { } f) Union(line.Id, f);
        }

        return lines.Keys.ToDictionary(id => id, Find);
    }

    // Follows successor links to the most recent fork; a cycle stops at the
    // first repeat.
    public static LineInfo EndOfChain(int lineId, IReadOnlyDictionary<int, LineInfo> lines)
    {
        var current = lines[lineId];
        var seen = new HashSet<int> { current.Id };
        while (current.SuccessorLineId is { } next && lines.TryGetValue(next, out var successor) && seen.Add(next))
        {
            current = successor;
        }
        return current;
    }
}
