using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class PedigreeRulesTests
{
    // Founders = 1, Roma-A = 2 (renamed to Roma-Classic = 3), Beta = 4, Empty = 5.
    private static Dictionary<int, LineInfo> Lines(bool renamed = false) => new()
    {
        [1] = new(1, "Founders", true, null, null, true, false),
        [2] = new(2, "Roma-A", false, renamed ? 3 : null, null, true, true),
        [3] = new(3, "Roma-Classic", false, null, renamed ? 2 : null, renamed, true),
        [4] = new(4, "Beta", false, null, null, true, true),
        [5] = new(5, "Empty", false, null, null, false, false),
    };

    private static ParentInfo Parent(string id, int line, int gen, char kind = 'F') =>
        new(id, id.ToUpperInvariant(), line, gen, TagFormatter.Label(kind, gen));

    private static PlacementRequest Req(ParentInfo? m, ParentInfo? f, int? lineId = null, bool startNew = false,
        string? name = null, string? editing = null, bool editingFounder = false) =>
        new(m?.PlantId, f?.PlantId, m, f, lineId, startNew, name, editing, editingFounder);

    private static PedigreeException Fails(PlacementRequest req, IReadOnlyDictionary<int, LineInfo>? lines = null) =>
        Assert.Throws<PedigreeException>(() => PedigreeRules.Place(req, lines ?? Lines()));

    // ---- no parents ----

    [Fact]
    public void No_parents_goes_to_Founders_P0()
    {
        var r = PedigreeRules.Place(Req(null, null), Lines());
        Assert.Equal(1, r.LineId);
        Assert.Equal('P', r.Kind);
        Assert.Equal(0, r.Generation);
        Assert.False(r.StartsNewLine);
    }

    [Fact]
    public void No_parents_with_a_named_line_is_400()
    {
        var ex = Fails(Req(null, null, lineId: 2));
        Assert.Equal("no_parents_founders_only", ex.Code);
        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("A plant with no parents belongs to Founders.", ex.Message);
    }

    [Fact]
    public void No_parents_with_an_empty_named_line_is_400() =>
        Assert.Equal("no_parents_founders_only", Fails(Req(null, null, lineId: 5)).Code);

    [Fact]
    public void No_parents_with_start_new_line_is_400() =>
        Assert.Equal("no_parents_founders_only", Fails(Req(null, null, startNew: true)).Code);

    [Fact]
    public void No_parents_with_the_Founders_line_id_is_fine() =>
        Assert.Equal(1, PedigreeRules.Place(Req(null, null, lineId: 1), Lines()).LineId);

    // ---- same line ----

    [Fact]
    public void Both_parents_in_the_same_line_and_generation_give_next_generation()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 2), Parent("f", 2, 2)), Lines());
        Assert.Equal(2, r.LineId);
        Assert.Equal('F', r.Kind);
        Assert.Equal(3, r.Generation);
        Assert.False(r.StartsNewLine);
        Assert.Empty(r.Origins);
    }

    [Fact]
    public void Different_generations_in_one_line_count_from_the_highest()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 2), Parent("f", 2, 3)), Lines());
        Assert.Equal(2, r.LineId);
        Assert.Equal(4, r.Generation);
    }

    [Fact]
    public void Cross_with_a_self_generation_parent_uses_the_highest()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 2, 2, 'S')), Lines());
        Assert.Equal(4, r.Generation);
    }

    [Fact]
    public void Self_of_a_line_plant_stays_in_the_line_as_S_next()
    {
        var p = Parent("m", 2, 1);
        var r = PedigreeRules.Place(Req(p, p), Lines());
        Assert.Equal(2, r.LineId);
        Assert.Equal('S', r.Kind);
        Assert.Equal(2, r.Generation);
        Assert.True(r.IsSelf);
    }

    [Fact]
    public void Self_with_start_new_line_is_S1_in_a_new_line()
    {
        var p = Parent("m", 2, 1);
        var r = PedigreeRules.Place(Req(p, p, startNew: true, name: "Roma Selfed"), Lines());
        Assert.True(r.StartsNewLine);
        Assert.Null(r.LineId);
        Assert.Equal("Roma Selfed", r.NewLineName);
        Assert.Equal('S', r.Kind);
        Assert.Equal(1, r.Generation);
    }

    [Fact]
    public void Start_new_line_on_a_same_line_pair_is_F1_with_origins()
    {
        var m = Parent("m", 2, 2);
        var f = Parent("f", 2, 3);
        var r = PedigreeRules.Place(Req(m, f, startNew: true, name: "Brand New"), Lines());
        Assert.True(r.StartsNewLine);
        Assert.False(r.ForcedNewLine);
        Assert.Equal(1, r.Generation);
        Assert.Equal('F', r.Kind);
        Assert.Collection(r.Origins,
            o => { Assert.Equal("mother", o.Role); Assert.Equal(2, o.SourceLineId); Assert.Equal("Roma-A", o.SourceLineName); Assert.Equal("F2", o.SourceLabel); Assert.Equal("M", o.SourcePlantTag); },
            o => { Assert.Equal("father", o.Role); Assert.Equal("F3", o.SourceLabel); });
    }

    // ---- rename chain ----

    [Fact]
    public void Rename_chain_counts_as_one_line_and_goes_to_the_end_of_the_chain()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 3, 1)), Lines(renamed: true));
        Assert.Equal(3, r.LineId);
        Assert.Equal(4, r.Generation);
        Assert.False(r.StartsNewLine);
    }

    [Fact]
    public void Child_of_an_old_line_plant_defaults_to_the_new_line_and_keeps_counting()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 2, 3)), Lines(renamed: true));
        Assert.Equal(3, r.LineId);
        Assert.Equal(4, r.Generation);
    }

    [Fact]
    public void Explicit_old_line_in_the_chain_is_accepted_and_still_counts_from_the_parents()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 2, 3), lineId: 2), Lines(renamed: true));
        Assert.Equal(2, r.LineId);
        Assert.Equal(4, r.Generation);
    }

    [Fact]
    public void Explicit_line_outside_the_chain_is_400()
    {
        var ex = Fails(Req(Parent("m", 2, 3), Parent("f", 2, 3), lineId: 4));
        Assert.Equal("line_not_allowed", ex.Code);
        Assert.Equal("line", ex.Field);
    }

    [Fact]
    public void Explicit_Founders_line_for_parents_is_400() =>
        Assert.Equal("line_not_allowed", Fails(Req(Parent("m", 2, 3), Parent("f", 2, 3), lineId: 1)).Code);

    [Fact]
    public void Choices_list_the_end_of_chain_first_then_the_other_chain_line_then_new()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 2, 3)), Lines(renamed: true));
        Assert.Equal(new int?[] { 3, 2, null }, r.Choices.Select(c => c.LineId).ToArray());
        Assert.True(r.Choices.Last().IsNew);
    }

    // ---- cross lines / founders ----

    [Fact]
    public void Parents_in_different_lines_make_a_new_line_F1()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 4, 2)), Lines());
        Assert.True(r.StartsNewLine);
        Assert.True(r.ForcedNewLine);
        Assert.Equal(1, r.Generation);
        Assert.Equal('F', r.Kind);
        Assert.Equal("M x F", r.NewLineName); // default is built from the parents' tags (F7)
        Assert.Equal(2, r.Origins.Count);
        Assert.Equal(4, r.Origins[1].SourceLineId);
    }

    [Fact]
    public void Any_founder_parent_makes_a_new_line_F1()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 1, 0, 'P'), Parent("f", 2, 2)), Lines());
        Assert.True(r.StartsNewLine);
        Assert.True(r.ForcedNewLine);
        Assert.Equal(1, r.Generation);
        Assert.Equal("M x F", r.NewLineName);
    }

    [Fact]
    public void Two_founders_make_a_new_line_F1()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 1, 0, 'P'), Parent("f", 1, 0, 'P')), Lines());
        Assert.True(r.StartsNewLine);
        Assert.Equal('F', r.Kind);
        Assert.Equal(1, r.Generation);
    }

    [Fact]
    public void Self_of_a_founder_is_S1_in_a_new_line()
    {
        var p = Parent("m", 1, 0, 'P');
        var r = PedigreeRules.Place(Req(p, p, name: "Fresh Line"), Lines());
        Assert.True(r.StartsNewLine);
        Assert.Equal('S', r.Kind);
        Assert.Equal(1, r.Generation);
        Assert.Equal("Fresh Line", r.NewLineName);
    }

    [Fact]
    public void Self_default_name_when_omitted()
    {
        var p = Parent("m", 1, 0, 'P');
        Assert.Equal("M selfed", PedigreeRules.Place(Req(p, p), Lines()).NewLineName);
    }

    [Fact]
    public void A_plant_with_parents_is_never_placed_in_Founders()
    {
        var lines = Lines();
        var parents = new[] { Parent("a", 1, 0, 'P'), Parent("b", 2, 1), Parent("c", 4, 3) };
        foreach (var m in parents)
        foreach (var f in parents)
        {
            var r = PedigreeRules.Place(Req(m, f, name: $"N{m.PlantId}{f.PlantId}"), lines);
            Assert.NotEqual(1, r.LineId);
        }
    }

    [Fact]
    public void Taken_new_line_name_is_409_case_insensitive()
    {
        var ex = Fails(Req(Parent("m", 2, 3), Parent("f", 4, 2), name: "beta"));
        Assert.Equal("line_name_taken", ex.Code);
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("lineName", ex.Field);
    }

    [Fact]
    public void New_line_name_is_validated()
    {
        var ex = Fails(Req(Parent("m", 2, 3), Parent("f", 4, 2), name: "bad<name>"));
        Assert.Equal("invalid_line_name", ex.Code);
    }

    [Fact]
    public void Default_new_line_name_is_cut_to_40_characters()
    {
        var lines = Lines();
        lines[2] = lines[2] with { Name = new string('a', 30) };
        lines[4] = lines[4] with { Name = new string('b', 30) };
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 4, 2)), lines);
        Assert.True(r.NewLineName!.Length <= 40);
    }

    // ---- explicit empty line ----

    [Fact]
    public void Explicit_empty_line_gets_the_plant_at_generation_1_with_origins_recorded()
    {
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 4, 2), lineId: 5), Lines());
        Assert.Equal(5, r.LineId);
        Assert.False(r.StartsNewLine);
        Assert.Equal(1, r.Generation);
        Assert.Equal(2, r.Origins.Count);
    }

    [Fact]
    public void Explicit_empty_line_that_already_has_an_origin_records_nothing_more()
    {
        var lines = Lines();
        lines[5] = lines[5] with { HasOrigin = true };
        var r = PedigreeRules.Place(Req(Parent("m", 2, 3), Parent("f", 4, 2), lineId: 5), lines);
        Assert.Empty(r.Origins);
    }

    [Fact]
    public void Line_id_together_with_start_new_line_is_400() =>
        Assert.Equal("line_conflict", Fails(Req(Parent("m", 2, 3), Parent("f", 2, 3), lineId: 2, startNew: true)).Code);

    // ---- validation ----

    [Fact]
    public void Mother_only_is_one_parent_naming_the_father_field()
    {
        var req = new PlacementRequest("m", null, Parent("m", 2, 1), null, null, false, null);
        var ex = Fails(req);
        Assert.Equal("one_parent", ex.Code);
        Assert.Equal("father", ex.Field);
        Assert.Equal("Pick both parents, or leave both empty for a founder.", ex.Message);
    }

    [Fact]
    public void Father_only_is_one_parent_naming_the_mother_field()
    {
        var req = new PlacementRequest(null, "f", null, Parent("f", 2, 1), null, false, null);
        var ex = Fails(req);
        Assert.Equal("one_parent", ex.Code);
        Assert.Equal("mother", ex.Field);
    }

    [Fact]
    public void Unresolved_parent_is_parent_not_found_echoing_only_the_sent_id()
    {
        var req = new PlacementRequest("ghost", "f", null, Parent("f", 2, 1), null, false, null);
        var ex = Fails(req);
        Assert.Equal("parent_not_found", ex.Code);
        Assert.Equal("mother", ex.Field);
        Assert.Equal("There is no plant ghost in this project.", ex.Message);
    }

    [Fact]
    public void Unresolved_father_names_the_father_field()
    {
        var req = new PlacementRequest("m", "ghost", Parent("m", 2, 1), null, null, false, null);
        Assert.Equal("father", Fails(req).Field);
    }

    [Fact]
    public void Own_parent_on_edit_is_400()
    {
        var req = new PlacementRequest("me", "f", Parent("me", 2, 1), Parent("f", 2, 1), null, false, null, "me");
        var ex = Fails(req);
        Assert.Equal("own_parent", ex.Code);
        Assert.Equal("mother", ex.Field);
        Assert.Equal("A plant cannot be its own mother or father.", ex.Message);
    }

    [Fact]
    public void Own_father_on_edit_is_400()
    {
        var req = new PlacementRequest("m", "me", Parent("m", 2, 1), Parent("me", 2, 1), null, false, null, "me");
        Assert.Equal("father", Fails(req).Field);
    }

    [Fact]
    public void Founders_plant_cannot_get_parents()
    {
        var ex = Fails(Req(Parent("m", 2, 1), Parent("f", 2, 1), editing: "p1", editingFounder: true));
        Assert.Equal("founder_no_parents", ex.Code);
    }

    [Fact]
    public void Non_founder_cannot_be_edited_to_no_parents() =>
        Assert.Equal("parents_required", Fails(Req(null, null, editing: "x")).Code);

    [Fact]
    public void Lines_missing_from_the_project_map_fail_closed_as_line_not_found()
    {
        var ex = Fails(Req(Parent("m", 99, 1), Parent("f", 2, 1)));
        Assert.Equal("line_not_found", ex.Code);
    }

    [Fact]
    public void No_Founders_line_in_the_project_is_line_not_found()
    {
        var lines = Lines();
        lines.Remove(1);
        Assert.Equal("line_not_found", Fails(Req(null, null), lines).Code);
    }

    // ---- ancestor walk through the rules ----

    private static Dictionary<string, AncestorWalk.Edge> Edges(params (string id, string? m, string? f)[] rows) =>
        rows.ToDictionary(r => r.id, r => new AncestorWalk.Edge(r.m, r.f));

    [Fact]
    public void Descendant_parent_is_rejected_for_child_and_grandchild()
    {
        var edges = Edges(("x", "a", "b"), ("child", "x", "c"), ("grand", "child", "c"), ("a", null, null), ("b", null, null), ("c", null, null));

        var ex = Assert.Throws<PedigreeException>(() =>
            PedigreeRules.EnsureNotDescendant("x", Parent("child", 2, 2), Parent("c", 2, 1), edges, 1000, 50000));
        Assert.Equal("descendant_parent", ex.Code);
        Assert.Equal("mother", ex.Field);
        Assert.Equal("CHILD is a descendant of this plant, so it cannot be its parent.", ex.Message);

        var ex2 = Assert.Throws<PedigreeException>(() =>
            PedigreeRules.EnsureNotDescendant("x", Parent("c", 2, 1), Parent("grand", 2, 3), edges, 1000, 50000));
        Assert.Equal("father", ex2.Field);
    }

    [Fact]
    public void Self_descendant_loop_is_rejected()
    {
        var edges = Edges(("x", "a", "b"), ("a", "x", null), ("b", null, null));
        Assert.Throws<PedigreeException>(() =>
            PedigreeRules.EnsureNotDescendant("x", Parent("a", 2, 1), Parent("b", 2, 1), edges, 1000, 50000));
    }

    [Fact]
    public void Sibling_and_cousin_are_accepted()
    {
        var edges = Edges(("x", "p", "q"), ("sib", "p", "q"), ("cousin", "u", "v"), ("u", "p", null), ("p", null, null), ("q", null, null), ("v", null, null));
        PedigreeRules.EnsureNotDescendant("x", Parent("sib", 2, 2), Parent("cousin", 2, 2), edges, 1000, 50000);
    }

    [Fact]
    public void Walk_over_the_cap_is_pedigree_too_deep_through_the_rules()
    {
        var rows = Enumerable.Range(0, 1100).Select(i => ($"n{i}", (string?)$"n{i + 1}", (string?)null)).ToArray();
        var ex = Assert.Throws<PedigreeException>(() =>
            PedigreeRules.EnsureNotDescendant("x", Parent("n0", 2, 1), Parent("n0", 2, 1), Edges(rows), 1000, 50000));
        Assert.Equal("pedigree_too_deep", ex.Code);
    }
}
