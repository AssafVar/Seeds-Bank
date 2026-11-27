using System.Globalization;
using System.Text.RegularExpressions;

namespace SeedsBank.Server.Services.Pedigree;

// All thresholds in one place.
public static class StabilityRules
{
    // A population needs at least this many plants with every trait filled.
    public const int MinScoredPlants = 3;

    // At most this share of the scored plants may differ from the modal value.
    public const decimal MaxOffTypeFraction = 0.10m;

    // Numeric traits: a value differing from the median by more than this
    // share is off-type; two medians within this share count as the same.
    public const double NumericTolerance = 0.15;

    // The newest this-many generations must both be uniform and agree.
    public const int MinConsecutivePopulations = 2;
}

public static class StabilityStates
{
    public const string Stable = "stable";
    public const string LooksStable = "looksStable";
    public const string Segregating = "segregating";
    public const string None = "none";
}

// The values of one plant's traits in a fixed order. Step 1 fills it from the
// four text columns; step 2 can fill it from each plant's latest typed
// observation without changing the evaluator.
public sealed record PlantTraits(IReadOnlyList<string?> Values)
{
    public static PlantTraits FromText(string? fruitColor, string? fruitWeight, string? seedColor, string? seedWeight) =>
        new(new[] { fruitColor, fruitWeight, seedColor, seedWeight });
}

// All plants of one generation (populations merged, across a rename chain).
public sealed record GenerationSample(string Label, int Generation, IReadOnlyList<PlantTraits> Plants);

public sealed record StabilityResult(string State, bool LooksStable, IReadOnlyList<string> GenerationsJudged);

// Pure: "looks stable" from trait text, no database.
public static class StabilityEvaluator
{
    private static readonly Regex Leading = new(@"^\s*([+-]?\d+(?:[.,]\d+)?)", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static StabilityResult Evaluate(bool isFounders, bool isMarkedStable, IReadOnlyList<GenerationSample> generations)
    {
        if (isFounders) return new StabilityResult(StabilityStates.None, false, Array.Empty<string>());

        var newest = Merge(generations)
            .Where(g => g.Plants.Count > 0)
            .OrderByDescending(g => g.Generation)
            .ToList();

        var judged = newest.Take(StabilityRules.MinConsecutivePopulations).ToList();
        var labels = judged.Select(g => g.Label).ToList();
        var enough = newest.Count >= StabilityRules.MinConsecutivePopulations;
        var looks = enough && LooksStable(judged);

        if (isMarkedStable) return new StabilityResult(StabilityStates.Stable, looks, labels);
        if (!enough) return new StabilityResult(StabilityStates.None, false, Array.Empty<string>());
        return new StabilityResult(looks ? StabilityStates.LooksStable : StabilityStates.Segregating, looks, labels);
    }

    // Samples with the same generation number become one (across the chain).
    public static IReadOnlyList<GenerationSample> Merge(IEnumerable<GenerationSample> samples) =>
        samples
            .GroupBy(s => s.Generation)
            .Select(g => new GenerationSample(g.First().Label, g.Key, g.SelectMany(s => s.Plants).ToList()))
            .ToList();

    private static bool LooksStable(IReadOnlyList<GenerationSample> judged)
    {
        var summaries = judged.Select(Summarise).ToList();
        if (summaries.Any(s => s is null)) return false;

        var first = summaries[0]!;
        return summaries.Skip(1).All(s => AgreeOnEveryTrait(first, s!));
    }

    private sealed record TraitSummary(bool Numeric, string? ModalText, double Median);

    // Null when the generation is not uniform.
    private static List<TraitSummary>? Summarise(GenerationSample sample)
    {
        var scored = sample.Plants
            .Where(p => p.Values.Count > 0 && p.Values.All(v => !string.IsNullOrWhiteSpace(v)))
            .ToList();

        if (scored.Count < StabilityRules.MinScoredPlants) return null;

        var traitCount = scored.Min(p => p.Values.Count);
        var result = new List<TraitSummary>();

        for (var t = 0; t < traitCount; t++)
        {
            var values = scored.Select(p => p.Values[t]!.Trim()).ToList();
            var numbers = values.Select(ParseNumber).ToList();
            var numeric = numbers.All(n => n is not null);

            int off;
            TraitSummary summary;
            if (numeric)
            {
                var list = numbers.Select(n => n!.Value).OrderBy(n => n).ToList();
                var median = Median(list);
                off = list.Count(n => !WithinTolerance(n, median));
                summary = new TraitSummary(true, null, median);
            }
            else
            {
                var normalised = values.Select(Normalise).ToList();
                var modal = normalised
                    .GroupBy(v => v)
                    .OrderByDescending(g => g.Count())
                    .ThenBy(g => g.Key, StringComparer.Ordinal)
                    .First();
                off = normalised.Count - modal.Count();
                summary = new TraitSummary(false, modal.Key, 0);
            }

            if (off > StabilityRules.MaxOffTypeFraction * scored.Count) return null;
            result.Add(summary);
        }

        return result;
    }

    private static bool AgreeOnEveryTrait(List<TraitSummary> a, List<TraitSummary> b)
    {
        if (a.Count != b.Count) return false;
        for (var i = 0; i < a.Count; i++)
        {
            if (a[i].Numeric != b[i].Numeric) return false;
            var same = a[i].Numeric
                ? WithinTolerance(a[i].Median, b[i].Median)
                : a[i].ModalText == b[i].ModalText;
            if (!same) return false;
        }
        return true;
    }

    private static bool WithinTolerance(double value, double reference)
    {
        var scale = Math.Max(Math.Abs(value), Math.Abs(reference));
        if (scale == 0) return true;
        return Math.Abs(value - reference) / scale <= StabilityRules.NumericTolerance;
    }

    private static double Median(List<double> sorted)
    {
        var mid = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    private static double? ParseNumber(string text)
    {
        var m = Leading.Match(text);
        if (!m.Success) return null;
        return double.TryParse(m.Groups[1].Value.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var n)
            ? n
            : null;
    }

    private static string Normalise(string text) =>
        string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();
}
