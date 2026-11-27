using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class PedigreeRulesSiblingTests
{
    // Founders = 1, Roma-A = 2, Cherry = 4, Empty sibling = 5, Unrelated = 6
    private static Dictionary<int, LineInfo> Lines() => new()
    {
        [1] = new(1, "Founders", true, null, null, true, false),
        [2] = new(2, "Roma-A", false, null, null, true, true),
        [4] = new(4, "Cherry", false, null, null, true, true),
        [5] = new(5, "Sibling B", false, null, null, false, true),
        [6] = new(6, "Unrelated", false, null, null, true, true),
    };

    private static ParentInfo Founder(string id) => new(id, id.ToUpperInvariant(), 1, 0, "P");

    private static PlacementRequest Req(int? lineId = null, bool startNew = false, string? name = null, params SiblingCandidate[] siblings) =>
        new("a", "b", Founder("a"), Founder("b"), lineId, startNew, name, Siblings: siblings);

    [Fact]
    public void Without_siblings_the_cross_starts_a_new_line_and_it_is_forced()
    {
        var r = PedigreeRules.Place(Req(name: "Fresh"), Lines());

        Assert.True(r.StartsNewLine);
        Assert.True(r.ForcedNewLine);
        Assert.Equal(1, r.Generation);
        Assert.Single(r.Choices);
    }

    [Fact]
    public void With_siblings_the_plant_joins_the_oldest_at_the_sibling_generation_and_nothing_is_forced()
    {
        var r = PedigreeRules.Place(Req(siblings: new[] { new SiblingCandidate(5, 1), new SiblingCandidate(2, 2) }), Lines());

        Assert.Equal(2, r.LineId);
        Assert.Equal(2, r.Generation);
        Assert.False(r.StartsNewLine);
        Assert.False(r.ForcedNewLine);
        Assert.Empty(r.Origins);
        Assert.Equal(new int?[] { 2, 5, null }, r.Choices.Select(c => c.LineId));
        Assert.Equal(new[] { false, false, true }, r.Choices.Select(c => c.IsNew));
    }

    [Fact]
    public void StartNewLine_always_starts_a_new_line_even_with_siblings()
    {
        var r = PedigreeRules.Place(Req(startNew: true, name: "Again", siblings: new SiblingCandidate(2, 1)), Lines());

        Assert.True(r.StartsNewLine);
        Assert.False(r.ForcedNewLine);
        Assert.Equal(2, r.Origins.Count);
    }

    [Fact]
    public void An_explicit_sibling_line_is_accepted_even_when_it_is_not_the_oldest_and_even_when_empty()
    {
        var r = PedigreeRules.Place(Req(lineId: 5, siblings: new[] { new SiblingCandidate(2, 3), new SiblingCandidate(5, 1) }), Lines());

        Assert.Equal(5, r.LineId);
        Assert.Equal(1, r.Generation);
        Assert.Empty(r.Origins);
    }

    [Fact]
    public void An_explicit_line_that_is_not_a_sibling_is_still_line_not_allowed()
    {
        var ex = Assert.Throws<PedigreeException>(() =>
            PedigreeRules.Place(Req(lineId: 6, siblings: new SiblingCandidate(2, 1)), Lines()));

        Assert.Equal("line_not_allowed", ex.Code);
    }

    [Fact]
    public void A_same_line_pair_ignores_the_siblings()
    {
        var m = new ParentInfo("m", "M", 2, 2, "F2");
        var f = new ParentInfo("f", "F", 2, 3, "F3");

        var r = PedigreeRules.Place(new PlacementRequest("m", "f", m, f, null, false, null, Siblings: new[] { new SiblingCandidate(4, 1) }), Lines());

        Assert.Equal(2, r.LineId);
        Assert.Equal(4, r.Generation);
    }

    [Fact]
    public void Siblings_in_the_Founders_line_or_unknown_lines_are_ignored()
    {
        var r = PedigreeRules.Place(Req(name: "Fresh", siblings: new[] { new SiblingCandidate(1, 1), new SiblingCandidate(99, 1) }), Lines());

        Assert.True(r.StartsNewLine);
        Assert.True(r.ForcedNewLine);
    }
}
