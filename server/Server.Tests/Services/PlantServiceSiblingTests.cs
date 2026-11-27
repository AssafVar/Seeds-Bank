using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Tests.Services;

// The same cross again lands in the same line (design section 2, sibling lines).
public class PlantServiceSiblingTests
{
    private static async Task<(TestServices S, string P, PlantDto A, PlantDto B)> WorldAsync()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        return (s, p, await s.FounderAsync(p), await s.FounderAsync(p));
    }

    [Fact]
    public async Task A_x_B_twice_lands_in_the_same_line_at_F1()
    {
        var (s, p, a, b) = await WorldAsync();

        var first = await s.CrossAsync(p, a, b, "Roma A");
        var second = await s.CrossAsync(p, a, b);

        Assert.Equal(first.Line.Id, second.Plants[0].LineId);
        Assert.Equal(first.Plants[0].PopulationId, second.Plants[0].PopulationId);
        Assert.Equal("F1", second.Plants[0].Label);
        Assert.Equal("RA-F1-002", second.Plants[0].Tag);
        Assert.Equal(2, await s.Db.Lines.CountAsync()); // Founders + Roma A
        Assert.Equal(2, await s.Db.LineOrigins.CountAsync()); // origin rows only once
    }

    [Fact]
    public async Task B_x_A_matches_A_x_B()
    {
        var (s, p, a, b) = await WorldAsync();
        var first = await s.CrossAsync(p, a, b, "Roma A");

        var reversed = await s.CrossAsync(p, b, a);

        Assert.Equal(first.Line.Id, reversed.Plants[0].LineId);
        Assert.Equal("F1", reversed.Plants[0].Label);
    }

    [Fact]
    public async Task Two_different_founder_crosses_stay_separate_lines()
    {
        var (s, p, a, b) = await WorldAsync();
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);

        var ab = await s.CrossAsync(p, a, b, "Roma A");
        var cd = await s.CrossAsync(p, c, d, "Cherry C");
        var ac = await s.CrossAsync(p, a, c, "Mixed");

        Assert.Equal(3, new[] { ab.Line.Id, cd.Line.Id, ac.Line.Id }.Distinct().Count());
        Assert.Equal(new[] { "RA-F1-001", "CC-F1-001", "MIX-F1-001" }, new[] { ab, cd, ac }.Select(x => x.Plants[0].Tag));
    }

    [Fact]
    public async Task Self_of_a_founder_twice_lands_in_the_same_S1_line_and_is_not_the_cross()
    {
        var (s, p, a, b) = await WorldAsync();
        var first = await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = a.PlantId, FatherPlantId = a.PlantId, NewLineName = "Selfed A" });
        var second = await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = a.PlantId, FatherPlantId = a.PlantId });
        var cross = await s.CrossAsync(p, a, b, "Cross AB");

        Assert.Equal(first.Line.Id, second.Plants[0].LineId);
        Assert.Equal("S1", second.Plants[0].Label);
        Assert.NotEqual(first.Line.Id, cross.Line.Id);
    }

    [Fact]
    public async Task StartNewLine_with_an_existing_sibling_makes_a_new_line()
    {
        var (s, p, a, b) = await WorldAsync();
        var first = await s.CrossAsync(p, a, b, "Roma A");

        var again = await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true, NewLineName = "Roma B" });

        Assert.NotEqual(first.Line.Id, again.Plants[0].LineId);
        Assert.Equal("Roma B", again.Line.Name);
        Assert.Equal("F1", again.Plants[0].Label);
    }

    [Fact]
    public async Task Several_sibling_lines_default_to_the_oldest_and_an_explicit_one_is_accepted()
    {
        var (s, p, a, b) = await WorldAsync();
        var first = await s.CrossAsync(p, a, b, "Roma A");
        var second = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true, NewLineName = "Roma B" })).Line;

        var defaulted = await s.CrossAsync(p, a, b);
        var explicitSecond = await s.CrossAsync(p, a, b, lineId: second.Id);

        Assert.Equal(first.Line.Id, defaulted.Plants[0].LineId);
        Assert.Equal(second.Id, explicitSecond.Plants[0].LineId);
        var preview = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId });
        Assert.Equal(new int?[] { first.Line.Id, second.Id, null }, preview.AllowedLineChoices.Select(c => c.LineId));
        Assert.Equal(first.Line.Id, preview.Line.Id);
        Assert.False(preview.ForcedNewLine);
        Assert.False(preview.StartsNewLine);
        Assert.Equal("joins", preview.Population.Action);
        Assert.Equal("RA-F1-003", preview.SuggestedTag);
    }

    [Fact]
    public async Task Preview_of_a_cross_without_siblings_is_forced_and_with_startNewLine_is_not()
    {
        var (s, p, a, b) = await WorldAsync();

        var fresh = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Roma A" });
        Assert.True(fresh.ForcedNewLine);

        await s.CrossAsync(p, a, b, "Roma A");
        var forcedByUser = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true, NewLineName = "Roma B" });
        Assert.True(forcedByUser.StartsNewLine);
        Assert.False(forcedByUser.ForcedNewLine);
        Assert.Null(forcedByUser.Line.Id);
    }

    [Fact]
    public async Task After_a_rename_the_same_cross_goes_to_the_line_with_the_origin_rows_at_F1_not_to_its_successor()
    {
        var (s, p, a, b) = await WorldAsync();
        var first = await s.CrossAsync(p, a, b, "Roma A", count: 2);
        var f2 = await s.CrossAsync(p, first.Plants[0], first.Plants[1]);
        var renamed = await s.Lines.RenameLineAsync(p, first.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        var again = await s.CrossAsync(p, a, b);

        Assert.Equal(first.Line.Id, again.Plants[0].LineId);
        Assert.Equal("F1", again.Plants[0].Label);
        Assert.NotEqual(renamed!.NewLine.Id, again.Plants[0].LineId);
        Assert.Equal("F2", f2.Plants[0].Label);
    }

    [Fact]
    public async Task A_cross_of_two_line_plants_matches_by_line_and_label_not_by_plant()
    {
        var (s, p, a, b) = await WorldAsync();
        var roma = await s.CrossAsync(p, a, b, "Roma A", count: 2);
        var c = await s.FounderAsync(p);
        var cherry = await s.CrossAsync(p, c, c, "Cherry C"); // S1 in Cherry C
        var cherry2 = await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = c.PlantId, FatherPlantId = c.PlantId });

        var first = await s.CrossAsync(p, roma.Plants[0], cherry.Plants[0], "Roma x Cherry");
        var other = await s.CrossAsync(p, roma.Plants[1], cherry2.Plants[0]); // other plants, same lines and labels (F1, S1)

        Assert.Equal(first.Line.Id, other.Plants[0].LineId);
        Assert.Equal("F1", other.Plants[0].Label);
    }

    [Fact]
    public async Task A_legacy_line_without_origin_rows_matches_through_its_sibling_plant_at_that_plants_generation()
    {
        var (s, p, a, b) = await WorldAsync();
        var line = new Line { ProjectId = p, Name = "Old Roma", Code = "OR", NextSeq = 2 };
        var population = new Population { ProjectId = p, Line = line, Kind = 'F', Generation = 2 };
        s.Db.ProjectItems.Add(new ProjectItem { PlantId = "legacy-1", ProjectId = p, Tag = "OR-F2-001", Population = population, MotherPlantId = a.PlantId, FatherPlantId = b.PlantId });
        await s.Db.SaveChangesAsync();

        var result = await s.CrossAsync(p, a, b);

        Assert.Equal(line.Id, result.Plants[0].LineId);
        Assert.Equal("F2", result.Plants[0].Label);
        Assert.Equal("OR-F2-002", result.Plants[0].Tag);
    }

    [Fact]
    public async Task Names_never_match_a_line_called_the_same_without_the_parents_is_no_sibling()
    {
        var (s, p, a, b) = await WorldAsync();
        var c = await s.FounderAsync(p);
        await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Roma A" });

        var result = await s.CrossAsync(p, a, c, "Roma AC");

        Assert.Equal("Roma AC", result.Line.Name);
        Assert.Equal(1, result.Plants[0].Generation);
    }

    // ---- undo of a parents edit ----

    [Fact]
    public async Task Undo_of_a_parents_edit_succeeds_when_the_original_line_still_has_other_plants()
    {
        var (s, p, a, b) = await WorldAsync();
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);
        var roma = await s.CrossAsync(p, a, b, "Roma A", count: 3);
        var plant = roma.Plants[0];
        var moved = await s.Plants.UpdateParentsAsync(p, plant.PlantId, new UpdateParentsRequest
            { MotherPlantId = c.PlantId, FatherPlantId = d.PlantId, NewLineName = "Other CD", Version = plant.Version });
        Assert.Equal(2, roma.Plants.Count - 1); // the line still has two other plants

        var undone = await s.Plants.UpdateParentsAsync(p, plant.PlantId, new UpdateParentsRequest
        {
            MotherPlantId = moved!.PreviousMotherPlantId,
            FatherPlantId = moved.PreviousFatherPlantId,
            LineId = moved.PreviousLineId,
            Version = moved.Plant.Version,
        });

        Assert.Equal(roma.Line.Id, undone!.Plant.LineId);
        Assert.Equal(plant.PopulationId, undone.Plant.PopulationId);
        Assert.Equal(a.PlantId, undone.Plant.Mother!.PlantId);
        Assert.Equal(b.PlantId, undone.Plant.Father!.PlantId);
        Assert.Equal(plant.Tag, undone.Plant.Tag);
        Assert.Equal("F1", undone.Plant.Label);
    }

    [Fact]
    public async Task Undo_of_a_parents_edit_succeeds_when_the_original_line_is_left_empty_because_origin_rows_remain()
    {
        var (s, p, a, b) = await WorldAsync();
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);
        var roma = await s.CrossAsync(p, a, b, "Roma A");
        var plant = roma.Plants[0];
        var moved = await s.Plants.UpdateParentsAsync(p, plant.PlantId, new UpdateParentsRequest
            { MotherPlantId = c.PlantId, FatherPlantId = d.PlantId, NewLineName = "Other CD", Version = plant.Version });

        var undone = await s.Plants.UpdateParentsAsync(p, plant.PlantId, new UpdateParentsRequest
        {
            MotherPlantId = moved!.PreviousMotherPlantId, FatherPlantId = moved.PreviousFatherPlantId,
            LineId = moved.PreviousLineId, Version = moved.Plant.Version,
        });

        Assert.Equal(roma.Line.Id, undone!.Plant.LineId);
        Assert.Equal(plant.PopulationId, undone.Plant.PopulationId);
    }

    [Fact]
    public async Task The_edited_plant_does_not_vouch_for_its_own_line_when_its_parents_change()
    {
        var (s, p, a, b) = await WorldAsync();
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);
        // A legacy line (no origin rows) holding only one plant, from A x B.
        var line = new Line { ProjectId = p, Name = "Legacy", Code = "LG", NextSeq = 2 };
        var population = new Population { ProjectId = p, Line = line, Kind = 'F', Generation = 1 };
        s.Db.ProjectItems.Add(new ProjectItem { PlantId = "legacy-1", ProjectId = p, Tag = "LG-F1-001", Population = population, MotherPlantId = a.PlantId, FatherPlantId = b.PlantId });
        await s.Db.SaveChangesAsync();

        // Editing that plant to C x D: with no sibling it must start a new line, not stay in Legacy.
        var result = await s.Plants.UpdateParentsAsync(p, "legacy-1", new UpdateParentsRequest
            { MotherPlantId = c.PlantId, FatherPlantId = d.PlantId, NewLineName = "From CD", Version = 1 });

        Assert.Equal("From CD", result!.Line.Name);
        Assert.NotEqual(line.Id, result.Plant.LineId);
    }

    [Fact]
    public async Task Unrelated_explicit_lineId_is_still_line_not_allowed()
    {
        var (s, p, a, b) = await WorldAsync();
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);
        await s.CrossAsync(p, a, b, "Roma A");
        var cd = await s.CrossAsync(p, c, d, "Cherry C");

        await TestServices.Rejects(() => s.CrossAsync(p, a, b, lineId: cd.Line.Id), "line_not_allowed", 400);
    }
}
