using System.Text;

namespace SeedsBank.Server.Services.Pedigree;

// Tag prefix for a line, derived from its name: initials of the words, else
// the first letters of a single word, then a numeric suffix until it is free.
// ASCII letters and digits only (tags are ASCII), never empty, at most 6.
public static class LineCodes
{
    public const int MaxLength = 6;
    private const string Fallback = "L";

    public static string From(string? name, IEnumerable<string> taken)
    {
        var takenSet = new HashSet<string>(taken, StringComparer.OrdinalIgnoreCase);
        var baseCode = Base(name);

        if (!takenSet.Contains(baseCode)) return baseCode;

        for (var n = 2; ; n++)
        {
            var suffix = n.ToString();
            var head = baseCode.Length + suffix.Length > MaxLength
                ? baseCode[..(MaxLength - suffix.Length)]
                : baseCode;
            var candidate = head + suffix;
            if (!takenSet.Contains(candidate)) return candidate;
        }
    }

    private static string Base(string? name)
    {
        var words = new List<string>();
        var current = new StringBuilder();
        foreach (var ch in name ?? string.Empty)
        {
            if (IsAsciiLetterOrDigit(ch))
            {
                current.Append(char.ToUpperInvariant(ch));
            }
            else if (current.Length > 0)
            {
                words.Add(current.ToString());
                current.Clear();
            }
        }
        if (current.Length > 0) words.Add(current.ToString());

        if (words.Count == 0) return Fallback;
        if (words.Count == 1) return words[0].Length <= 3 ? words[0] : words[0][..3];

        var initials = new string(words.Take(3).Select(w => w[0]).ToArray());
        return initials;
    }

    private static bool IsAsciiLetterOrDigit(char ch) =>
        (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9');
}
