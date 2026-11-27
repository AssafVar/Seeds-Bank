namespace SeedsBank.Server.Services.Pedigree;

// One parent as the sibling rule sees it: a Founders plant is the exact plant
// (line = Founders line, label = its tag); any other parent is its source line
// and population label, e.g. (Roma-A, F3).
public readonly record struct ParentKey(int LineId, string Label);

// The unordered pair of parent keys (A x B equals B x A) plus whether it is a
// self. A self of a founder is {K, K}.
public sealed record PairKey(ParentKey First, ParentKey Second, bool IsSelf)
{
    public static PairKey Of(ParentKey mother, ParentKey father, bool isSelf)
    {
        var ordered = new[] { mother, father }
            .OrderBy(k => k.LineId).ThenBy(k => k.Label, StringComparer.Ordinal).ToArray();
        return new PairKey(ordered[0], ordered[1], isSelf);
    }
}

// A line that already holds the same cross, and the generation a new sibling
// takes there.
public sealed record SiblingCandidate(int LineId, int Generation);

public sealed record SiblingOriginRow(int LineId, string Role, int? SourceLineId, string SourceLabel, string? SourcePlantTag);

// A plant with its placement; parents are ids (null when missing or removed).
public sealed record SiblingPlantRow(
    string PlantId, string Tag, int LineId, int Generation, string Label, string? MotherId, string? FatherId);

// Sibling lines (design section 2): a non-Founders line is a sibling line of
// a pair of parents when (a) its mother/father origin rows match the pair key,
// or (b) it holds another plant whose own parents give the same key. Matching
// is on parent lines, labels and founder plants, never on a line name.
public static class SiblingLines
{
    public static ParentKey KeyOf(bool parentInFounders, int lineId, string label, string tag) =>
        parentInFounders ? new ParentKey(lineId, tag) : new ParentKey(lineId, label);

    public static IReadOnlyList<SiblingCandidate> Find(
        PairKey key,
        IReadOnlyDictionary<int, LineInfo> lines,
        IEnumerable<SiblingOriginRow> origins,
        IEnumerable<SiblingPlantRow> plants,
        string? excludedPlantId)
    {
        var result = new Dictionary<int, int>();

        // (a) origin rows
        foreach (var group in origins.GroupBy(o => o.LineId))
        {
            if (!lines.TryGetValue(group.Key, out var line) || line.IsFounders) continue;
            var mother = group.FirstOrDefault(o => o.Role == Models.LineOrigin.RoleMother);
            var father = group.FirstOrDefault(o => o.Role == Models.LineOrigin.RoleFather);
            if (mother is null || father is null) continue;
            if (OriginKey(mother, lines) is not { } m || OriginKey(father, lines) is not { } f) continue;

            var isSelf = mother.SourcePlantTag is not null && mother.SourcePlantTag == father.SourcePlantTag;
            if (PairKey.Of(m, f, isSelf) == key) result[group.Key] = 1;
        }

        // (b) another plant in the line with the same parents
        var byId = plants.ToDictionary(p => p.PlantId, StringComparer.Ordinal);
        var viaPlants = new Dictionary<int, int>();
        foreach (var plant in byId.Values)
        {
            if (plant.PlantId == excludedPlantId || plant.MotherId is null || plant.FatherId is null) continue;
            if (!lines.TryGetValue(plant.LineId, out var line) || line.IsFounders) continue;
            if (!byId.TryGetValue(plant.MotherId, out var mother) || !byId.TryGetValue(plant.FatherId, out var father)) continue;
            if (!lines.TryGetValue(mother.LineId, out var ml) || !lines.TryGetValue(father.LineId, out var fl)) continue;

            var k = PairKey.Of(KeyOf(ml.IsFounders, mother.LineId, mother.Label, mother.Tag),
                KeyOf(fl.IsFounders, father.LineId, father.Label, father.Tag), mother.PlantId == father.PlantId);
            if (k != key) continue;

            viaPlants[plant.LineId] = viaPlants.TryGetValue(plant.LineId, out var low) ? Math.Min(low, plant.Generation) : plant.Generation;
        }
        foreach (var (lineId, generation) in viaPlants)
        {
            result.TryAdd(lineId, generation); // origin rows say generation 1 and win
        }

        return result.OrderBy(kv => kv.Key).Select(kv => new SiblingCandidate(kv.Key, kv.Value)).ToList();
    }

    private static ParentKey? OriginKey(SiblingOriginRow row, IReadOnlyDictionary<int, LineInfo> lines)
    {
        if (row.SourceLineId is not { } source || !lines.TryGetValue(source, out var line)) return null;
        return line.IsFounders
            ? row.SourcePlantTag is null ? null : new ParentKey(source, row.SourcePlantTag)
            : new ParentKey(source, row.SourceLabel);
    }
}
