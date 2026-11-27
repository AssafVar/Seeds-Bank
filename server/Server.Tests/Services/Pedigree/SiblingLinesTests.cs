using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class SiblingLinesTests
{
    // Founders = 1, Roma-A = 2, Roma-Classic = 3 (fork of 2), Cherry = 4, Other = 5, Legacy = 6
    private static Dictionary<int, LineInfo> Lines() => new()
    {
        [1] = new(1, "Founders", true, null, null, true, false),
        [2] = new(2, "Roma-A", false, 3, null, true, true),
        [3] = new(3, "Roma-Classic", false, null, 2, true, true),
        [4] = new(4, "Cherry", false, null, null, true, true),
        [5] = new(5, "Other", false, null, null, true, true),
        [6] = new(6, "Legacy", false, null, null, true, false),
    };

    private static ParentKey F(string tag) => new(1, tag);
    private static PairKey Cross(ParentKey a, ParentKey b) => PairKey.Of(a, b, false);
    private static PairKey Self(ParentKey a) => PairKey.Of(a, a, true);

    private static SiblingOriginRow Mother(int line, int source, string label, string? tag) => new(line, "mother", source, label, tag);
    private static SiblingOriginRow Father(int line, int source, string label, string? tag) => new(line, "father", source, label, tag);

    private static IReadOnlyList<SiblingCandidate> Find(PairKey key, IEnumerable<SiblingOriginRow>? origins = null,
        IEnumerable<SiblingPlantRow>? plants = null, string? excluded = null) =>
        SiblingLines.Find(key, Lines(), origins ?? Array.Empty<SiblingOriginRow>(), plants ?? Array.Empty<SiblingPlantRow>(), excluded);

    private static SiblingOriginRow[] RomaOrigin() => new[] { Mother(2, 1, "P", "A"), Father(2, 1, "P", "B") };

    [Fact]
    public void A_x_B_matches_the_line_whose_origin_rows_name_A_and_B_and_B_x_A_is_the_same_cross()
    {
        var ab = Find(Cross(F("A"), F("B")), RomaOrigin());
        var ba = Find(Cross(F("B"), F("A")), RomaOrigin());

        Assert.Equal(new[] { new SiblingCandidate(2, 1) }, ab);
        Assert.Equal(ab, ba);
    }

    [Fact]
    public void Two_different_founder_pairs_never_match_each_other()
    {
        Assert.Empty(Find(Cross(F("A"), F("C")), RomaOrigin()));
        Assert.Empty(Find(Cross(F("C"), F("D")), RomaOrigin()));
    }

    [Fact]
    public void A_self_does_not_match_a_cross_of_the_same_founder_and_a_self_matches_a_self()
    {
        var selfOrigin = new[] { Mother(4, 1, "P", "A"), Father(4, 1, "P", "A") };

        Assert.Empty(Find(Self(F("A")), RomaOrigin()));
        Assert.Empty(Find(Cross(F("A"), F("B")), selfOrigin));
        Assert.Equal(new[] { new SiblingCandidate(4, 1) }, Find(Self(F("A")), selfOrigin));
    }

    [Fact]
    public void Parents_in_lines_match_by_source_line_and_label_not_by_plant_or_name()
    {
        var origin = new[] { Mother(5, 2, "F3", "R-3"), Father(5, 4, "S2", "C-1") };
        var key = Cross(new ParentKey(2, "F3"), new ParentKey(4, "S2"));

        Assert.Equal(new[] { new SiblingCandidate(5, 1) }, Find(key, origin));
        Assert.Equal(new[] { new SiblingCandidate(5, 1) }, Find(Cross(new ParentKey(4, "S2"), new ParentKey(2, "F3")), origin));
        Assert.Empty(Find(Cross(new ParentKey(2, "F2"), new ParentKey(4, "S2")), origin)); // label F3 vs F2
        Assert.Empty(Find(Cross(new ParentKey(3, "F3"), new ParentKey(4, "S2")), origin)); // another line
    }

    [Fact]
    public void A_rename_chain_does_not_change_matching_the_line_with_the_origin_rows_is_the_sibling()
    {
        var result = Find(Cross(F("A"), F("B")), RomaOrigin());

        Assert.Single(result);
        Assert.Equal(2, result[0].LineId); // Roma-A, not its fork Roma-Classic (3)
        Assert.Equal(1, result[0].Generation);
    }

    [Fact]
    public void Several_sibling_lines_come_back_oldest_first()
    {
        var origins = new[] { Mother(5, 1, "P", "A"), Father(5, 1, "P", "B") }.Concat(RomaOrigin());

        Assert.Equal(new[] { 2, 5 }, Find(Cross(F("A"), F("B")), origins).Select(c => c.LineId));
    }

    private static SiblingPlantRow Founder(string id) => new(id, id.ToUpperInvariant(), 1, 0, "P", null, null);
    private static SiblingPlantRow Child(string id, int line, int gen, string mother, string father) =>
        new(id, id.ToUpperInvariant(), line, gen, $"F{gen}", mother, father);

    [Fact]
    public void A_legacy_line_without_origin_rows_matches_through_a_sibling_plant_with_the_lowest_generation()
    {
        var plants = new[] { Founder("a"), Founder("b"), Child("x1", 6, 3, "a", "b"), Child("x2", 6, 2, "b", "a") };

        var result = Find(Cross(F("A"), F("B")), plants: plants);

        Assert.Equal(new[] { new SiblingCandidate(6, 2) }, result);
    }

    [Fact]
    public void The_plant_being_edited_does_not_vouch_for_itself()
    {
        var plants = new[] { Founder("a"), Founder("b"), Child("x1", 6, 1, "a", "b") };

        Assert.Single(Find(Cross(F("A"), F("B")), plants: plants));
        Assert.Empty(Find(Cross(F("A"), F("B")), plants: plants, excluded: "x1"));
    }

    [Fact]
    public void Origin_rows_win_the_generation_over_sibling_plants()
    {
        var plants = new[] { Founder("a"), Founder("b"), Child("x1", 2, 4, "a", "b") };

        Assert.Equal(new[] { new SiblingCandidate(2, 1) }, Find(Cross(F("A"), F("B")), RomaOrigin(), plants));
    }

    [Fact]
    public void Plants_whose_parents_are_missing_or_in_the_founders_line_never_make_a_line_a_sibling()
    {
        var plants = new[] { Founder("a"), Founder("b"), new SiblingPlantRow("f1", "F1", 1, 0, "P", "a", "b"), Child("gone", 6, 1, "a", "removed") };

        Assert.Empty(Find(Cross(F("A"), F("B")), plants: plants));
    }
}
