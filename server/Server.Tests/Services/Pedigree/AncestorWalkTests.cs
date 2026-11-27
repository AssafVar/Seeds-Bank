using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class AncestorWalkTests
{
    private static Dictionary<string, AncestorWalk.Edge> Edges(params (string id, string? m, string? f)[] rows) =>
        rows.ToDictionary(r => r.id, r => new AncestorWalk.Edge(r.m, r.f));

    [Fact]
    public void Finds_a_grandparent()
    {
        var edges = Edges(("c", "b", "x"), ("b", "a", "y"), ("a", null, null));
        Assert.True(AncestorWalk.Reaches(edges, "c", "a", 1000, 50000));
    }

    [Fact]
    public void Does_not_reach_a_sibling_or_cousin()
    {
        var edges = Edges(("s1", "p", "q"), ("s2", "p", "q"), ("p", "g", "h"), ("q", null, null),
                          ("cousin", "u", "v"), ("u", "g", "h"), ("g", null, null), ("h", null, null), ("v", null, null));
        Assert.False(AncestorWalk.Reaches(edges, "s1", "s2", 1000, 50000));
        Assert.False(AncestorWalk.Reaches(edges, "s1", "cousin", 1000, 50000));
    }

    [Fact]
    public void Start_equal_to_target_is_reached() =>
        Assert.True(AncestorWalk.Reaches(Edges(), "a", "a", 10, 10));

    [Fact]
    public void Legacy_cycle_terminates()
    {
        var edges = Edges(("a", "b", null), ("b", "c", null), ("c", "a", null));
        Assert.False(AncestorWalk.Reaches(edges, "a", "zzz", 1000, 50000));
    }

    [Fact]
    public void Depth_over_the_cap_is_rejected_not_accepted()
    {
        var rows = Enumerable.Range(0, 1100).Select(i => ($"n{i}", (string?)$"n{i + 1}", (string?)null)).ToArray();
        var ex = Assert.Throws<PedigreeException>(() => AncestorWalk.Reaches(Edges(rows), "n0", "never", 1000, 50000));
        Assert.Equal("pedigree_too_deep", ex.Code);
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Chain_at_exactly_the_cap_is_still_walked()
    {
        var rows = Enumerable.Range(0, 5).Select(i => ($"n{i}", (string?)$"n{i + 1}", (string?)null)).ToArray();
        Assert.True(AncestorWalk.Reaches(Edges(rows), "n0", "n5", 5, 100));
    }

    [Fact]
    public void Node_count_over_the_cap_is_rejected()
    {
        var rows = new List<(string, string?, string?)> { ("root", "a0", "b0") };
        for (var i = 0; i < 20; i++) rows.Add(($"a{i}", $"a{i + 1}", $"b{i + 1}"));
        var ex = Assert.Throws<PedigreeException>(() => AncestorWalk.Reaches(Edges(rows.ToArray()), "root", "never", 1000, 10));
        Assert.Equal("pedigree_too_deep", ex.Code);
    }
}
