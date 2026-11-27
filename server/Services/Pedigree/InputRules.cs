using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace SeedsBank.Server.Services.Pedigree;

// Bounds and normalisation for every user-supplied pedigree string. Pure.
public static class InputRules
{
    public const int MaxLineNameLength = 40;
    public const int MaxOriginNoteLength = 200;
    public const int MaxTraitLength = 200;
    public const int MaxSearchLength = 100;
    public const int MaxPageSize = 100;
    public const int DefaultPageSize = 25;
    public const int MaxPage = 100_000;
    public const int MinYear = 1900;
    public const int MaxYear = 2100;

    public static readonly string[] Seasons = { "Spring", "Summer", "Autumn", "Winter" };

    private static readonly Regex TagPattern = new("^[A-Za-z0-9._-]{1,24}\\z", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex LineNamePattern = new(@"^[\p{L}\p{N} -]+\z", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static bool IsValidTag(string? tag) => tag is not null && TagPattern.IsMatch(tag);

    public static string ValidateTag(string? tag)
    {
        if (!IsValidTag(tag))
        {
            throw new PedigreeException(PedigreeFields.Tag, PedigreeCodes.InvalidTag,
                "A tag can use letters, numbers, dots, dashes and underscores, up to 24 characters.");
        }
        return tag;
    }

    // Trimmed, 1..40, letters/numbers/space/dash only. Control, zero-width and
    // bidi-override characters are not letters or numbers, so they fail.
    public static string ValidateLineName(string? name)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (trimmed.Length < 1 || trimmed.Length > MaxLineNameLength || !LineNamePattern.IsMatch(trimmed))
        {
            throw new PedigreeException(PedigreeFields.LineName, PedigreeCodes.InvalidLineName,
                "A line name is 1 to 40 characters: letters, numbers, dashes and spaces.");
        }
        return trimmed;
    }

    public static string? ValidateOriginNote(string? note)
    {
        var trimmed = note?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (trimmed.Length > MaxOriginNoteLength || HasInvisibleOrControl(trimmed))
        {
            throw new PedigreeException("originNote", PedigreeCodes.InvalidInput,
                "The origin note is plain text of up to 200 characters.");
        }
        return trimmed;
    }

    // Trait text: trimmed, empty becomes null (the legacy "---" is not special
    // for new writes), no control characters, at most 200 characters.
    public static string? NormalizeTrait(string field, string? value)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (trimmed.Length > MaxTraitLength || HasInvisibleOrControl(trimmed))
        {
            throw new PedigreeException(field, PedigreeCodes.InvalidInput,
                "This value can be up to 200 characters of plain text.");
        }
        return trimmed;
    }

    public static string? ValidateSeason(string? season)
    {
        if (string.IsNullOrWhiteSpace(season)) return null;
        var match = Seasons.FirstOrDefault(s => s.Equals(season.Trim(), StringComparison.Ordinal));
        return match ?? throw new PedigreeException("season", PedigreeCodes.InvalidInput,
            "Season must be Spring, Summer, Autumn or Winter.");
    }

    public static short? ValidateYear(int? year)
    {
        if (year is null) return null;
        if (year < MinYear || year > MaxYear)
        {
            throw new PedigreeException("year", PedigreeCodes.InvalidInput, "Year must be between 1900 and 2100.");
        }
        return (short)year.Value;
    }

    // The search text: null for blank, a 400 over 100 characters.
    public static string? ValidateSearch(string? q)
    {
        var trimmed = q?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (trimmed.Length > MaxSearchLength)
        {
            throw new PedigreeException("q", PedigreeCodes.QueryTooLong, "The search text is too long.");
        }
        return trimmed;
    }

    // `%`, `_` and the escape character itself match literally. Use with
    // EF.Functions.Like(column, pattern, LikeEscape).
    public const string LikeEscape = "\\";

    public static string LikeContains(string text) =>
        "%" + text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";

    // page 1..100000, pageSize 1..100; skip as long so a huge page cannot overflow.
    public static (int Page, int PageSize, long Skip) ClampPaging(int page, int pageSize)
    {
        var p = Math.Clamp(page, 1, MaxPage);
        var s = Math.Clamp(pageSize, 1, MaxPageSize);
        return (p, s, (long)(p - 1) * s);
    }

    private static bool HasInvisibleOrControl(string text)
    {
        foreach (var rune in text.EnumerateRunes())
        {
            switch (Rune.GetUnicodeCategory(rune))
            {
                case UnicodeCategory.Control:
                case UnicodeCategory.Format:          // zero-width, bidi overrides
                case UnicodeCategory.LineSeparator:
                case UnicodeCategory.ParagraphSeparator:
                case UnicodeCategory.PrivateUse:
                case UnicodeCategory.OtherNotAssigned:
                case UnicodeCategory.Surrogate:
                    return true;
            }
        }
        return false;
    }
}
