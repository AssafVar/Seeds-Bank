namespace SeedsBank.Server.Services.Pedigree;

// Walks mother/father links upward over one project's (plant, mother, father)
// edges. Fails closed: legacy cycles end through the visited set, and a walk
// past the depth or node cap is rejected, never accepted silently.
public static class AncestorWalk
{
    public readonly record struct Edge(string? Mother, string? Father);

    // True when `target` is `start` or one of its ancestors.
    public static bool Reaches(
        IReadOnlyDictionary<string, Edge> edges, string start, string target, int maxDepth, int maxNodes)
    {
        if (string.Equals(start, target, StringComparison.Ordinal)) return true;

        var visited = new HashSet<string>(StringComparer.Ordinal) { start };
        var level = new List<string> { start };
        var depth = 0;

        while (level.Count > 0)
        {
            var next = new List<string>();
            foreach (var id in level)
            {
                if (!edges.TryGetValue(id, out var edge)) continue;

                foreach (var parent in new[] { edge.Mother, edge.Father })
                {
                    if (parent is null) continue;
                    if (string.Equals(parent, target, StringComparison.Ordinal)) return true;
                    if (visited.Add(parent)) next.Add(parent);
                }
            }

            if (visited.Count > maxNodes) throw TooDeep();
            if (next.Count == 0) return false;

            depth++;
            if (depth > maxDepth) throw TooDeep();
            level = next;
        }

        return false;
    }

    private static PedigreeException TooDeep() =>
        new(null, PedigreeCodes.PedigreeTooDeep, "This pedigree is too deep to check. Contact support.");
}
