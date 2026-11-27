using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services;

public class LineServiceTests
{
    private static async Task<(TestServices S, string P, CreatePlantsResponse F1)> RomaAsync(string? fruitColor = null, string? seedWeight = null)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var f1 = await s.Plants.CreateAsync(p, new CreatePlantsRequest
        {
            MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Roma A", Count = 3,
            FruitColor = fruitColor, FruitWeight = fruitColor is null ? null : "10g", SeedColor = fruitColor is null ? null : "black", SeedWeight = seedWeight,
        });
        return (s, p, f1);
    }

    // ---- create line ----

    [Fact]
    public async Task CreateLine_makes_an_empty_manual_line_with_a_code_from_its_name()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var line = await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "  Cherry Roma  ", OriginNote = " from a neighbour " });

        Assert.Equal("Cherry Roma", line.Name);
        Assert.Equal("CR", line.Code);
        Assert.False(line.IsFounders);
        Assert.Equal(0, line.PlantCount);
        Assert.Equal("from a neighbour", line.OriginNote);
        Assert.Equal("manual", line.Origin.Kind);
        Assert.Empty(line.Populations);
        Assert.Equal("none", line.StabilityState);
    }

    [Fact]
    public async Task CreateLine_codes_stay_unique_per_project()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var one = await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Roma Alpha" });
        var two = await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Rio Amber" });

        Assert.Equal("RA", one.Code);
        Assert.Equal("RA2", two.Code);
    }

    [Theory]
    [InlineData("Roma A")]
    [InlineData("roma a")]
    [InlineData("ROMA A")]
    [InlineData("  Roma A  ")]
    public async Task LineName_case_variant_conflicts(string again)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Roma A" });

        var ex = await TestServices.Rejects(() => s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = again }), "line_name_taken", 409);

        Assert.Equal("lineName", ex.Field);
        Assert.Equal(2, await s.Db.Lines.CountAsync());
    }

    [Fact]
    public async Task LineName_Founders_is_reserved_by_the_built_in_line()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        await TestServices.Rejects(() => s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "founders" }), "line_name_taken", 409);
    }

    // ---- rename (branch) ----

    private static string Snapshot(LineDto line) => JsonSerializer.Serialize(new
    {
        line.Id, line.Name, line.Code, line.IsStable, line.StableMarkedAt, line.LooksStable, line.StabilityState,
        line.Stability, line.PlantCount, line.Populations, line.Origin, line.OriginNote,
    });

    [Fact]
    public async Task RenameLine_branches_a_new_line_and_leaves_the_old_line_and_its_plants_untouched()
    {
        var (s, p, f1) = await RomaAsync("red", "1g");
        var before = await s.Lines.GetLineAsync(p, f1.Line.Id);
        var plantsBefore = (await s.Plants.GetPlantsAsync(p, new PlantListQuery { LineId = f1.Line.Id, PageSize = 100 })).Items;

        var result = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        Assert.Equal("Roma Classic", result!.NewLine.Name);
        Assert.Equal("RC", result.NewLine.Code);
        Assert.Equal(0, result.NewLine.PlantCount);
        Assert.Equal(result.NewLine.Id, result.OldLine.SuccessorLineId);
        Assert.Equal(Snapshot(before!), Snapshot(result.OldLine));
        var plantsAfter = (await s.Plants.GetPlantsAsync(p, new PlantListQuery { LineId = f1.Line.Id, PageSize = 100 })).Items;
        Assert.Equal(JsonSerializer.Serialize(plantsBefore), JsonSerializer.Serialize(plantsAfter));
        Assert.Equal(new[] { "RA-F1-001", "RA-F1-002", "RA-F1-003" }, plantsAfter.Select(x => x.Tag));
    }

    [Fact]
    public async Task RenameLine_records_a_forked_from_origin_with_the_latest_generation_by_default()
    {
        var (s, p, f1) = await RomaAsync();
        var f2 = (await s.CrossAsync(p, f1.Plants[0], f1.Plants[1])).Plants[0];

        var result = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        Assert.Equal("renamed", result!.NewLine.Origin.Kind);
        Assert.Equal("Roma A", result.NewLine.Origin.ForkedFrom!.LineName);
        Assert.Equal("F2", result.NewLine.Origin.ForkedFrom.Label);
        Assert.Equal(f1.Line.Id, result.NewLine.Origin.ForkedFrom.LineId);
        Assert.Equal(f2.LineId, f1.Line.Id);
    }

    [Fact]
    public async Task RenameLine_from_a_chosen_population_uses_its_label()
    {
        var (s, p, f1) = await RomaAsync();
        await s.CrossAsync(p, f1.Plants[0], f1.Plants[1]);

        var result = await s.Lines.RenameLineAsync(p, f1.Line.Id,
            new RenameLineRequest { NewName = "Roma Classic", FromPopulationId = f1.Plants[0].PopulationId });

        Assert.Equal("F1", result!.NewLine.Origin.ForkedFrom!.Label);
    }

    [Fact]
    public async Task RenameLine_copies_the_stable_mark_and_the_verdict()
    {
        var (s, p, f1) = await RomaAsync("red", "1g");
        await s.CrossAsync(p, f1.Plants[0], f1.Plants[1], count: 3);
        // 3 uniform plants in F1 and F2 (the second cross carries no traits yet).
        var marked = await s.Lines.SetStableAsync(p, f1.Line.Id, true);

        var result = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        Assert.True(result!.NewLine.IsStable);
        Assert.Equal(marked!.StableMarkedAt, result.NewLine.StableMarkedAt);
        Assert.Equal("stable", result.NewLine.StabilityState);
        Assert.Equal(result.OldLine.LooksStable, result.NewLine.LooksStable);
        Assert.Equal(result.OldLine.Stability.GenerationsJudged, result.NewLine.Stability.GenerationsJudged);
    }

    [Fact]
    public async Task RenameLine_new_line_shows_the_looks_stable_verdict_of_the_chain_before_it_has_plants()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var f1 = await s.Plants.CreateAsync(p, new CreatePlantsRequest
        {
            MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Roma A", Count = 3,
            FruitColor = "red", FruitWeight = "10g", SeedColor = "black", SeedWeight = "1g",
        });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest
        {
            MotherPlantId = f1.Plants[0].PlantId, FatherPlantId = f1.Plants[1].PlantId, Count = 3,
            FruitColor = "red", FruitWeight = "10g", SeedColor = "black", SeedWeight = "1g",
        });
        var old = await s.Lines.GetLineAsync(p, f1.Line.Id);
        Assert.Equal("looksStable", old!.StabilityState);

        var result = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        Assert.True(result!.NewLine.LooksStable);
        Assert.Equal("looksStable", result.NewLine.StabilityState);
        Assert.Equal(old.Stability.GenerationsJudged, result.NewLine.Stability.GenerationsJudged);
        Assert.Equal(Snapshot(old), Snapshot(result.OldLine));
    }

    [Fact]
    public async Task RenameLine_a_second_fork_keeps_the_first_listed_and_children_go_to_the_newest()
    {
        var (s, p, f1) = await RomaAsync();
        var first = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });
        var second = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Plus" });

        Assert.Equal(second!.NewLine.Id, second.OldLine.SuccessorLineId);
        Assert.Equal(new[] { first!.NewLine.Id, second.NewLine.Id }, second.OldLine.Forks.Select(f => f.LineId));
        var child = (await s.CrossAsync(p, f1.Plants[0], f1.Plants[1])).Plants[0];
        Assert.Equal(second.NewLine.Id, child.LineId);
    }

    [Fact]
    public async Task RenameLine_duplicate_name_409_founders_400_missing_null()
    {
        var (s, p, f1) = await RomaAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);

        await TestServices.Rejects(() => s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "ROMA A" }), "line_name_taken", 409);
        await TestServices.Rejects(() => s.Lines.RenameLineAsync(p, founders.Id, new RenameLineRequest { NewName = "Anything" }), "founders_line", 400);
        await TestServices.Rejects(() => s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "  " }), "invalid_line_name", 400);
        Assert.Null(await s.Lines.RenameLineAsync(p, 99999, new RenameLineRequest { NewName = "Whatever" }));
        Assert.Equal(2, await s.Db.Lines.CountAsync());
    }

    // ---- stable ----

    [Fact]
    public async Task SetStable_marks_and_unmarks_a_line_and_refuses_founders()
    {
        var (s, p, f1) = await RomaAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);

        var on = await s.Lines.SetStableAsync(p, f1.Line.Id, true);
        Assert.True(on!.IsStable);
        Assert.NotNull(on.StableMarkedAt);
        Assert.Equal("stable", on.StabilityState);

        var off = await s.Lines.SetStableAsync(p, f1.Line.Id, false);
        Assert.False(off!.IsStable);
        Assert.Null(off.StableMarkedAt);

        await TestServices.Rejects(() => s.Lines.SetStableAsync(p, founders.Id, true), "founders_line", 400);
        Assert.Null(await s.Lines.SetStableAsync(p, 99999, true));
    }

    // ---- delete line ----

    [Fact]
    public async Task DeleteLine_removes_an_empty_line_with_its_populations_and_origins()
    {
        var (s, p, f1) = await RomaAsync();
        var empty = await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Empty" });
        await s.Lines.CreatePopulationAsync(p, new CreatePopulationRequest { LineId = empty.Id, Season = "Spring", Year = 2026 });

        Assert.True(await s.Lines.DeleteLineAsync(p, empty.Id));

        Assert.False(await s.Db.Lines.AnyAsync(l => l.Id == empty.Id));
        Assert.False(await s.Db.Populations.AnyAsync(x => x.LineId == empty.Id));
    }

    [Fact]
    public async Task DeleteLine_with_plants_409_with_a_successor_409_founders_400_missing_false()
    {
        var (s, p, f1) = await RomaAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);
        var renamed = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        await TestServices.Rejects(() => s.Lines.DeleteLineAsync(p, f1.Line.Id), "line_not_empty", 409);
        await TestServices.Rejects(() => s.Lines.DeleteLineAsync(p, founders.Id), "founders_line", 400);
        Assert.False(await s.Lines.DeleteLineAsync(p, 99999));
        Assert.True(await s.Db.Lines.AnyAsync(l => l.Id == f1.Line.Id));

        // An emptied line that was continued still cannot go.
        await s.Plants.DeleteAsync(p, f1.Plants[0].PlantId, true);
        await s.Plants.DeleteAsync(p, f1.Plants[1].PlantId, true);
        await s.Plants.DeleteAsync(p, f1.Plants[2].PlantId, true);
        await TestServices.Rejects(() => s.Lines.DeleteLineAsync(p, f1.Line.Id), "line_has_successor", 409);
        Assert.NotNull(renamed);
    }

    [Fact]
    public async Task DeleteLine_repoints_the_predecessor_to_its_most_recent_remaining_fork()
    {
        var (s, p, f1) = await RomaAsync();
        var first = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });
        var second = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Plus" });

        Assert.True(await s.Lines.DeleteLineAsync(p, second!.NewLine.Id));
        var afterFirst = await s.Lines.GetLineAsync(p, f1.Line.Id);
        Assert.Equal(first!.NewLine.Id, afterFirst!.SuccessorLineId);
        Assert.Equal(new[] { first.NewLine.Id }, afterFirst.Forks.Select(f => f.LineId));

        Assert.True(await s.Lines.DeleteLineAsync(p, first.NewLine.Id));
        var afterBoth = await s.Lines.GetLineAsync(p, f1.Line.Id);
        Assert.Null(afterBoth!.SuccessorLineId);
        Assert.Empty(afterBoth.Forks);
    }

    // ---- populations ----

    [Fact]
    public async Task CreatePopulation_makes_an_empty_placeholder_named_from_season_and_field()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);
        var fieldId = await TwoUsers_AddField(s, p, "North field");

        var population = await s.Lines.CreatePopulationAsync(p, new CreatePopulationRequest { LineId = founders.Id, Season = "Spring", Year = 2026, FieldId = fieldId });

        Assert.Null(population.Kind);
        Assert.Null(population.Generation);
        Assert.Null(population.Label);
        Assert.Equal(0, population.PlantCount);
        Assert.Equal("Spring 2026 · North field", population.Name);
        Assert.Equal("North field", population.FieldName);
        Assert.Equal(p, (await s.Db.Populations.SingleAsync()).ProjectId);
    }

    private static Task<int> TwoUsers_AddField(TestServices s, string projectId, string name) =>
        Security.TwoUsers.AddFieldAsync(s, projectId, name);

    [Fact]
    public async Task CreatePopulation_identical_empty_placeholder_409_bad_season_400_unknown_line_400()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);
        var request = new CreatePopulationRequest { LineId = founders.Id, Season = "Summer", Year = 2026 };
        await s.Lines.CreatePopulationAsync(p, request);

        await TestServices.Rejects(() => s.Lines.CreatePopulationAsync(p, request), "population_exists", 409);
        await TestServices.Rejects(() => s.Lines.CreatePopulationAsync(p,
            new CreatePopulationRequest { LineId = founders.Id, Season = "Monsoon", Year = 2026 }), "invalid_input", 400);
        await TestServices.Rejects(() => s.Lines.CreatePopulationAsync(p,
            new CreatePopulationRequest { LineId = founders.Id, Season = null, Year = 2026 }), "invalid_input", 400);
        await TestServices.Rejects(() => s.Lines.CreatePopulationAsync(p,
            new CreatePopulationRequest { LineId = founders.Id, Season = "Summer", Year = 1800 }), "invalid_input", 400);
        await TestServices.Rejects(() => s.Lines.CreatePopulationAsync(p,
            new CreatePopulationRequest { LineId = 99999, Season = "Summer", Year = 2026 }), "line_not_found", 400);
        Assert.Equal(1, await s.Db.Populations.CountAsync());
    }

    [Fact]
    public async Task DeletePopulation_empty_removes_it_non_empty_409_missing_false()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var plant = await s.FounderAsync(p);
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);
        var spare = await s.Lines.CreatePopulationAsync(p, new CreatePopulationRequest { LineId = founders.Id, Season = "Winter", Year = 2026 });

        await TestServices.Rejects(() => s.Lines.DeletePopulationAsync(p, plant.PopulationId), "population_not_empty", 409);
        Assert.True(await s.Lines.DeletePopulationAsync(p, spare.Id));
        Assert.False(await s.Lines.DeletePopulationAsync(p, spare.Id));
        Assert.Equal(1, await s.Db.Populations.CountAsync());
        Assert.Equal(1, await s.Db.ProjectItems.CountAsync());
    }

    // ---- overview ----

    [Fact]
    public async Task Overview_lists_populations_newest_generation_first_with_labels_and_the_latest_flag()
    {
        var (s, p, f1) = await RomaAsync();
        await s.CrossAsync(p, f1.Plants[0], f1.Plants[1]);

        var roma = await s.Lines.GetLineAsync(p, f1.Line.Id);

        Assert.Equal(new[] { "F2", "F1" }, roma!.Populations.Select(x => x.Label));
        Assert.Equal(new[] { true, false }, roma.Populations.Select(x => x.IsLatestGeneration));
        Assert.Equal(4, roma.PlantCount);
        Assert.Equal(new[] { 1, 3 }, roma.Populations.Select(x => x.PlantCount));
    }

    [Fact]
    public async Task Overview_marks_every_population_of_founders_as_latest_and_judges_them_none()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Spring", Year = 2025 });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Spring", Year = 2026 });

        var overview = await s.Projects.GetProjectAsync("u1", p);

        var founders = Assert.Single(overview!.Lines);
        Assert.All(founders.Populations, x => Assert.True(x.IsLatestGeneration));
        Assert.Equal("none", founders.StabilityState);
        Assert.False(founders.LooksStable);
    }

    [Fact]
    public async Task Overview_a_segregating_line_and_a_looks_stable_line_get_their_state()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var f1 = await s.Plants.CreateAsync(p, new CreatePlantsRequest
        {
            MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Roma A", Count = 3,
            FruitColor = "red", FruitWeight = "10g", SeedColor = "black", SeedWeight = "1g",
        });
        var f2 = await s.Plants.CreateAsync(p, new CreatePlantsRequest
        {
            MotherPlantId = f1.Plants[0].PlantId, FatherPlantId = f1.Plants[1].PlantId, Count = 3,
            FruitColor = "yellow", FruitWeight = "10g", SeedColor = "black", SeedWeight = "1g",
        });

        Assert.Equal("segregating", f2.Line.StabilityState);
        Assert.False(f2.Line.LooksStable);
        Assert.Equal(new[] { "F2", "F1" }, f2.Line.Stability.GenerationsJudged);
    }

    [Fact]
    public async Task Overview_a_legacy_line_with_plants_and_no_origin_rows_is_imported()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var line = new Line { ProjectId = p, Name = "Old Roma", Code = "OR" };
        var population = new Population { ProjectId = p, Line = line, Kind = 'F', Generation = 2 };
        s.Db.ProjectItems.Add(new ProjectItem { PlantId = "legacy-1", ProjectId = p, Tag = "OR-F2-001", Population = population });
        await s.Db.SaveChangesAsync();

        var overview = await s.Lines.GetOverviewAsync(p);

        Assert.Equal("imported", overview.Single(l => l.Name == "Old Roma").Origin.Kind);
    }
}
