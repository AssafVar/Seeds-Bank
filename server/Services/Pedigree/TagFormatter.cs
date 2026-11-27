namespace SeedsBank.Server.Services.Pedigree;

// Generated tags and population labels.
public static class TagFormatter
{
    // P generation 0 is "P"; everything else {kind}{generation} (a legacy
    // "P3" or "F0" stays as the breeder wrote it).
    public static string Label(char kind, int generation) =>
        kind == 'P' && generation == 0 ? "P" : $"{kind}{generation}";

    // {code}-{label}-{seq:000}, e.g. RA-F3-014; Founders: P-014.
    public static string Format(string lineCode, bool isFounders, char kind, int generation, int seq)
    {
        var number = seq.ToString("000");
        return isFounders
            ? $"{lineCode}-{number}"
            : $"{lineCode}-{Label(kind, generation)}-{number}";
    }

    // Starts at startSeq and skips numbers whose tag is already used (a
    // breeder's custom tag that looks generated). Returns the tag and the
    // sequence number it used; the line counter then moves to seq + 1.
    public static (string Tag, int Seq) NextFree(
        string lineCode, bool isFounders, char kind, int generation, int startSeq, Func<string, bool> isTaken)
    {
        var seq = Math.Max(1, startSeq);
        for (var attempts = 0; attempts < 1_000_000; attempts++)
        {
            var tag = Format(lineCode, isFounders, kind, generation, seq);
            if (!isTaken(tag)) return (tag, seq);
            seq++;
        }

        throw new InvalidOperationException("No free tag number found.");
    }
}
