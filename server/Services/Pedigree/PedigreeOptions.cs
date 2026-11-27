namespace SeedsBank.Server.Services.Pedigree;

// Quotas and walk caps, read from configuration section "Pedigree" so tests
// and ops can change them.
public class PedigreeOptions
{
    public const string SectionName = "Pedigree";

    public int MaxPlantsPerProject { get; set; } = 20_000;
    public int MaxLinesPerProject { get; set; } = 500;
    public int MaxPopulationsPerLine { get; set; } = 200;

    // Ancestor walk caps: past either, the walk fails closed.
    public int MaxAncestorDepth { get; set; } = 1_000;
    public int MaxAncestorNodes { get; set; } = 50_000;
}
