using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services;

public class PlantServiceTests
{
    // ---- create ----

    [Fact]
    public async Task CreatePlant_count_1_inserts_with_generated_tag()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var plant = await s.FounderAsync(p, fruitColor: "red");

        Assert.Equal("P-001", plant.Tag);
        Assert.Equal("P", plant.Label);
        Assert.Equal("P", plant.Kind);
        Assert.Equal(0, plant.Generation);
        Assert.Equal(1, plant.Version);
        Assert.Equal(0, plant.ChildCount);
        Assert.Null(plant.Mother);
        Assert.Null(plant.Father);
        Assert.Equal("red", plant.FruitColor);
        Assert.Equal(p, plant.ProjectId);
        Assert.Equal(32, plant.PlantId.Length);
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);
        Assert.Equal(founders.Id, plant.LineId);
        Assert.Equal(2, founders.NextSeq);
    }

    [Fact]
    public async Task CreatePlant_NoParents_GoesToFounders_Gen0()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var result = await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 2 });

        Assert.All(result.Plants, pl => Assert.Equal(0, pl.Generation));
        Assert.True(result.Line.IsFounders);
        Assert.Equal(2, result.Line.PlantCount);
    }

    [Fact]
    public async Task CreatePlant_cross_of_founders_starts_a_new_line_with_origin_rows()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);

        var result = await s.CrossAsync(p, a, b, "Roma A");

        var plant = Assert.Single(result.Plants);
        Assert.Equal("RA-F1-001", plant.Tag);
        Assert.Equal(1, plant.Generation);
        Assert.Equal("F", plant.Kind);
        Assert.Equal(a.Tag, plant.Mother!.Tag);
        Assert.Equal(b.PlantId, plant.Father!.PlantId);
        Assert.False(plant.IsSelf);
        Assert.Equal("Roma A", result.Line.Name);
        Assert.Equal("cross", result.Line.Origin.Kind);
        Assert.Equal(new[] { "mother", "father" }, result.Line.Origin.Parents.Select(o => o.Role));
        Assert.Equal(new[] { a.Tag, b.Tag }, result.Line.Origin.Parents.Select(o => o.PlantTag));
    }

    [Fact]
    public async Task CreatePlant_self_of_a_founder_is_S1_in_a_new_line()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);

        var result = await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = a.PlantId, FatherPlantId = a.PlantId, NewLineName = "Selfed A" });

        var plant = result.Plants[0];
        Assert.True(plant.IsSelf);
        Assert.Equal("S", plant.Kind);
        Assert.Equal("S1", plant.Label);
        Assert.Equal("SA-S1-001", plant.Tag);
        Assert.Equal("self", result.Line.Origin.Kind);
    }

    [Fact]
    public async Task CreatePlant_sibling_cross_keeps_the_line()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var first = await s.CrossAsync(p, await s.FounderAsync(p), await s.FounderAsync(p), "Roma A", count: 2);
        var lineId = first.Line.Id;

        var second = await s.CrossAsync(p, first.Plants[0], first.Plants[1]);

        Assert.Equal(lineId, second.Plants[0].LineId);
        Assert.Equal("F2", second.Plants[0].Label);
        // One tag counter per line: F1 took 001 and 002, so F2 starts at 003.
        Assert.Equal("RA-F2-003", second.Plants[0].Tag);
        Assert.Equal(2, second.Line.Populations.Count);
        Assert.Equal(new[] { 2, 1 }, second.Line.Populations.Select(x => x.Generation!.Value));
    }

    [Fact]
    public async Task CreatePlant_count_300_gives_unique_tags_from_the_line_counter()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var result = await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 300 });

        Assert.Equal(300, result.Plants.Select(x => x.Tag).Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.Contains(result.Plants, x => x.Tag == "P-300");
        Assert.Equal(301, (await s.Db.Lines.SingleAsync(l => l.IsFounders)).NextSeq);
    }

    [Fact]
    public async Task CreatePlant_two_populations_of_one_line_and_generation_get_distinct_tags()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var spring = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Spring", Year = 2026 })).Plants[0];
        var summer = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Summer", Year = 2026 })).Plants[0];

        Assert.NotEqual(spring.PopulationId, summer.PopulationId);
        Assert.Equal("P-001", spring.Tag);
        Assert.Equal("P-002", summer.Tag);
    }

    [Fact]
    public async Task CreatePlant_joins_the_matching_population_instead_of_creating_one()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var first = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Spring", Year = 2026 })).Plants[0];
        var second = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Spring", Year = 2026 })).Plants[0];

        Assert.Equal(first.PopulationId, second.PopulationId);
        Assert.Equal(1, await s.Db.Populations.CountAsync());
    }

    [Fact]
    public async Task CreatePlant_adopts_an_empty_placeholder_population()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);
        var placeholder = await s.Lines.CreatePopulationAsync(p, new CreatePopulationRequest { LineId = founders.Id, Season = "Spring", Year = 2026 });
        Assert.Null(placeholder.Kind);

        var plant = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { PopulationId = placeholder.Id })).Plants[0];

        Assert.Equal(placeholder.Id, plant.PopulationId);
        var population = await s.Db.Populations.SingleAsync();
        Assert.Equal('P', population.Kind);
        Assert.Equal(0, population.Generation);
        Assert.Equal("Spring", population.Season);
    }

    [Fact]
    public async Task CreatePlant_a_placeholder_is_also_adopted_by_a_matching_plant_without_populationId()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);
        await s.Lines.CreatePopulationAsync(p, new CreatePopulationRequest { LineId = founders.Id, Season = "Autumn", Year = 2025 });

        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Autumn", Year = 2025 });

        Assert.Equal(1, await s.Db.Populations.CountAsync());
    }

    [Fact]
    public async Task CreatePlant_first_plant_of_an_empty_line_is_generation_1_and_records_its_origin()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var line = await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Empty" });
        Assert.Equal("manual", line.Origin.Kind);

        var result = await s.CrossAsync(p, a, b, lineId: line.Id);

        Assert.Equal(line.Id, result.Plants[0].LineId);
        Assert.Equal(1, result.Plants[0].Generation);
        Assert.Equal("EMP-F1-001".Replace("EMP", result.Line.Code), result.Plants[0].Tag);
        Assert.Equal("cross", result.Line.Origin.Kind);
    }

    [Fact]
    public async Task CreatePlant_custom_tag_is_used_and_must_be_unique_ignoring_case()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var plant = await s.FounderAsync(p, tag: "My-Tomato.1");
        Assert.Equal("My-Tomato.1", plant.Tag);
        // A custom tag does not move the line counter.
        Assert.Equal(1, (await s.Db.Lines.SingleAsync(l => l.IsFounders)).NextSeq);

        await TestServices.Rejects(() => s.FounderAsync(p, tag: "my-tomato.1"), "tag_taken", 409);
        Assert.Equal(1, await s.Db.ProjectItems.CountAsync());
    }

    [Fact]
    public async Task CreatePlant_generated_tag_skips_a_custom_tag_that_looks_generated()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.FounderAsync(p, tag: "P-001");

        var generated = await s.FounderAsync(p);

        Assert.Equal("P-002", generated.Tag);
    }

    [Fact]
    public async Task CreatePlant_with_two_populations_keeps_traits_trimmed_and_blank_as_null()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var result = await s.Plants.CreateAsync(p, new CreatePlantsRequest { FruitColor = "  red ", FruitWeight = "   ", SeedColor = "", SeedWeight = null });

        var plant = result.Plants[0];
        Assert.Equal("red", plant.FruitColor);
        Assert.Null(plant.FruitWeight);
        Assert.Null(plant.SeedColor);
        Assert.Null(plant.SeedWeight);
    }

    [Fact]
    public async Task CreatePlant_one_parent_is_400_one_parent_and_nothing_is_stored()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);

        var ex = await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = a.PlantId }), "one_parent", 400);

        Assert.Equal("father", ex.Field);
        Assert.Equal(1, await s.Db.ProjectItems.CountAsync());
    }

    [Fact]
    public async Task CreatePlant_dangling_parent_is_400_parent_not_found_with_field_and_nothing_is_stored()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var lines = await s.Db.Lines.CountAsync();

        var ex = await TestServices.Rejects(() => s.CrossAsync(p, a, new PlantDto { PlantId = "no-such-plant" }), "parent_not_found", 400);

        Assert.Equal("father", ex.Field);
        Assert.Contains("no-such-plant", ex.Message);
        Assert.Equal(1, await s.Db.ProjectItems.CountAsync());
        Assert.Equal(lines, await s.Db.Lines.CountAsync());
        Assert.Equal(1, await s.Db.Populations.CountAsync());
        Assert.Equal(2, (await s.Db.Lines.SingleAsync(l => l.IsFounders)).NextSeq);
    }

    [Fact]
    public async Task CreatePlant_new_line_name_taken_is_409_and_a_taken_default_name_too()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        await s.CrossAsync(p, a, b, "Roma A");

        // The same cross again joins its sibling line; only a deliberate new line meets the name rule.
        await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest
            { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true, NewLineName = "roma a" }), "line_name_taken", 409);
        Assert.Equal(3, await s.Db.ProjectItems.CountAsync());
    }

    [Fact]
    public async Task CreatePlant_explicit_line_outside_the_parents_chain_is_400_line_not_allowed()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var one = await s.CrossAsync(p, await s.FounderAsync(p), await s.FounderAsync(p), "Roma A", count: 2);
        var other = await s.CrossAsync(p, await s.FounderAsync(p), await s.FounderAsync(p), "Cherry B");

        await TestServices.Rejects(() => s.CrossAsync(p, one.Plants[0], one.Plants[1], lineId: other.Line.Id), "line_not_allowed", 400);
    }

    // ---- rename chain placement ----

    [Fact]
    public async Task CreatePlant_children_of_an_old_line_plant_default_to_the_newest_fork_and_lineId_can_pick_the_old_line()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var first = await s.CrossAsync(p, await s.FounderAsync(p), await s.FounderAsync(p), "Roma A", count: 2);
        var renamed = await s.Lines.RenameLineAsync(p, first.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        var toNew = await s.CrossAsync(p, first.Plants[0], first.Plants[1]);
        var toOld = await s.CrossAsync(p, first.Plants[0], first.Plants[1], lineId: first.Line.Id);

        Assert.Equal(renamed!.NewLine.Id, toNew.Plants[0].LineId);
        Assert.Equal("F2", toNew.Plants[0].Label);
        Assert.StartsWith(renamed.NewLine.Code + "-F2-", toNew.Plants[0].Tag);
        Assert.Equal(first.Line.Id, toOld.Plants[0].LineId);
        Assert.Equal("F2", toOld.Plants[0].Label);
    }

    // ---- traits ----

    [Fact]
    public async Task UpdateTraits_overwrites_traits_and_bumps_version()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var plant = await s.FounderAsync(p, fruitColor: "red");

        var updated = await s.Plants.UpdateTraitsAsync(p, plant.PlantId, new UpdatePlantRequest { FruitColor = "green", SeedWeight = " 2g ", Version = 1 });

        Assert.Equal("green", updated!.FruitColor);
        Assert.Equal("2g", updated.SeedWeight);
        Assert.Equal(2, updated.Version);
        Assert.Equal(plant.Tag, updated.Tag);
    }

    [Fact]
    public async Task UpdateTraits_null_leaves_a_trait_and_blank_clears_it()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var plant = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { FruitColor = "red", SeedColor = "black" })).Plants[0];

        var updated = await s.Plants.UpdateTraitsAsync(p, plant.PlantId, new UpdatePlantRequest { SeedColor = "  ", Version = 1 });

        Assert.Equal("red", updated!.FruitColor);
        Assert.Null(updated.SeedColor);
    }

    [Fact]
    public async Task UpdateTraits_stale_version_409_nothing_changed()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var plant = await s.FounderAsync(p, fruitColor: "red");
        await s.Plants.UpdateTraitsAsync(p, plant.PlantId, new UpdatePlantRequest { FruitColor = "green", Version = 1 });

        var ex = await TestServices.Rejects(
            () => s.Plants.UpdateTraitsAsync(p, plant.PlantId, new UpdatePlantRequest { FruitColor = "blue", Version = 1 }),
            "version_conflict", 409);

        Assert.Equal("This plant was changed elsewhere. Reload to see the latest.", ex.Message);
        var stored = await s.Db.ProjectItems.AsNoTracking().SingleAsync();
        Assert.Equal("green", stored.FruitColor);
        Assert.Equal(2, stored.RowVersion);
    }

    [Fact]
    public async Task UpdateTraits_missing_plant_returns_null()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        Assert.Null(await s.Plants.UpdateTraitsAsync(p, "missing", new UpdatePlantRequest { Version = 1 }));
    }

    [Fact]
    public async Task UpdateTraits_too_long_or_control_characters_are_400_invalid_input_with_the_field()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var plant = await s.FounderAsync(p);

        var tooLong = await TestServices.Rejects(
            () => s.Plants.UpdateTraitsAsync(p, plant.PlantId, new UpdatePlantRequest { FruitColor = new string('x', 201), Version = 1 }),
            "invalid_input", 400);
        Assert.Equal("fruitColor", tooLong.Field);
        await TestServices.Rejects(
            () => s.Plants.UpdateTraitsAsync(p, plant.PlantId, new UpdatePlantRequest { SeedColor = "a\u0000b", Version = 1 }),
            "invalid_input", 400);
        Assert.Equal(1, (await s.Db.ProjectItems.AsNoTracking().SingleAsync()).RowVersion);
    }

    // ---- edit parents ----

    private static async Task<(TestServices S, string P, PlantDto A, PlantDto B, CreatePlantsResponse F1)> RomaAsync(int f1Count = 2)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var f1 = await s.CrossAsync(p, a, b, "Roma A", count: f1Count);
        return (s, p, a, b, f1);
    }

    private static UpdateParentsRequest Parents(PlantDto mother, PlantDto father, int version, int? lineId = null, string? newLineName = null) =>
        new() { MotherPlantId = mother.PlantId, FatherPlantId = father.PlantId, Version = version, LineId = lineId, NewLineName = newLineName };

    [Fact]
    public async Task UpdateParents_moves_the_plant_to_the_new_line_and_reports_what_it_was()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);
        var plant = f1.Plants[0];

        var result = await s.Plants.UpdateParentsAsync(p, plant.PlantId, Parents(c, d, plant.Version, newLineName: "Other C"));

        Assert.Equal("Other C", result!.Line.Name);
        Assert.Equal(result.Line.Id, result.Plant.LineId);
        Assert.Equal(plant.Tag, result.Plant.Tag);
        Assert.Equal(2, result.Plant.Version);
        Assert.Equal("F1", result.PreviousLabel);
        Assert.Equal(f1.Line.Id, result.PreviousLineId);
        Assert.Equal(plant.PopulationId, result.PreviousPopulationId);
        Assert.Equal(a.PlantId, result.PreviousMotherPlantId);
        Assert.Equal(b.PlantId, result.PreviousFatherPlantId);
        Assert.Equal(c.PlantId, result.Plant.Mother!.PlantId);
    }

    [Fact]
    public async Task UpdateParents_keeps_the_tag_when_the_label_changes_and_uses_the_plants_season_and_place()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var founders = await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 2 });
        var f1 = (await s.Plants.CreateAsync(p, new CreatePlantsRequest
        {
            MotherPlantId = founders.Plants[0].PlantId, FatherPlantId = founders.Plants[1].PlantId, NewLineName = "Roma A", Count = 2,
        })).Plants;
        // z is a selfing (S2) in Roma A, grown in Spring 2026.
        var z = (await s.Plants.CreateAsync(p, new CreatePlantsRequest
        {
            MotherPlantId = f1[0].PlantId, FatherPlantId = f1[0].PlantId, Season = "Spring", Year = 2026,
        })).Plants[0];
        Assert.Equal("S2", z.Label);

        var result = await s.Plants.UpdateParentsAsync(p, z.PlantId, Parents(f1[0], f1[1], z.Version));

        Assert.Equal("F2", result!.Plant.Label);
        Assert.Equal(z.Tag, result.Plant.Tag);
        Assert.Equal("S2", result.PreviousLabel);
        var population = await s.Db.Populations.AsNoTracking().SingleAsync(x => x.Id == result.Plant.PopulationId);
        Assert.Equal("Spring", population.Season);
        Assert.Equal((short)2026, population.Year);
    }

    [Fact]
    public async Task UpdateParents_clears_the_removed_parent_markers()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var child = f1.Plants[0];
        await s.Plants.DeleteAsync(p, a.PlantId, confirm: true);
        var orphaned = await s.Plants.GetPlantAsync(p, child.PlantId);
        Assert.True(orphaned!.Mother!.Removed);
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);

        var result = await s.Plants.UpdateParentsAsync(p, child.PlantId, Parents(c, d, orphaned.Version, newLineName: "Other C"));

        Assert.False(result!.Plant.Mother!.Removed);
        var stored = await s.Db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == child.PlantId);
        Assert.Null(stored.MotherRemovedTag);
        Assert.Null(stored.FatherRemovedTag);
        Assert.Null(result.PreviousMotherPlantId);
        Assert.Equal(b.PlantId, result.PreviousFatherPlantId);
    }

    [Fact]
    public async Task UpdateParents_leaves_descendants_alone_and_reports_how_many()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var f2 = (await s.CrossAsync(p, f1.Plants[0], f1.Plants[1])).Plants[0];
        var f3 = (await s.CrossAsync(p, f2, f2)).Plants[0];
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);

        var result = await s.Plants.UpdateParentsAsync(p, f1.Plants[0].PlantId, Parents(c, d, f1.Plants[0].Version, newLineName: "Other C"));

        Assert.Equal(2, result!.DescendantCount);
        var storedF2 = await s.Plants.GetPlantAsync(p, f2.PlantId);
        var storedF3 = await s.Plants.GetPlantAsync(p, f3.PlantId);
        Assert.Equal("F2", storedF2!.Label);
        Assert.Equal(f2.PopulationId, storedF2.PopulationId);
        Assert.Equal(f3.Label, storedF3!.Label);
    }

    [Fact]
    public async Task UpdateParents_a_descendant_as_parent_is_400_descendant_parent()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var f2 = (await s.CrossAsync(p, f1.Plants[0], f1.Plants[1])).Plants[0];

        var ex = await TestServices.Rejects(
            () => s.Plants.UpdateParentsAsync(p, f1.Plants[0].PlantId, Parents(f2, b, f1.Plants[0].Version)),
            "descendant_parent", 400);

        Assert.Equal("mother", ex.Field);
        Assert.Equal(1, (await s.Db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == f1.Plants[0].PlantId)).RowVersion);
    }

    [Fact]
    public async Task UpdateParents_own_id_is_400_own_parent_and_one_parent_is_400_one_parent()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var plant = f1.Plants[0];

        await TestServices.Rejects(() => s.Plants.UpdateParentsAsync(p, plant.PlantId, Parents(plant, b, plant.Version)), "own_parent", 400);
        await TestServices.Rejects(() => s.Plants.UpdateParentsAsync(p, plant.PlantId,
            new UpdateParentsRequest { MotherPlantId = a.PlantId, Version = plant.Version }), "one_parent", 400);
        await TestServices.Rejects(() => s.Plants.UpdateParentsAsync(p, plant.PlantId,
            new UpdateParentsRequest { Version = plant.Version }), "parents_required", 400);
    }

    [Fact]
    public async Task UpdateParents_a_founder_cannot_get_parents()
    {
        var (s, p, a, b, f1) = await RomaAsync();

        await TestServices.Rejects(() => s.Plants.UpdateParentsAsync(p, a.PlantId, Parents(b, b, a.Version)), "founder_no_parents", 400);
    }

    [Fact]
    public async Task UpdateParents_undo_with_the_previous_line_and_parents_restores_line_and_population()
    {
        var (s, p, a, b, f1) = await RomaAsync(f1Count: 1);
        var plant = f1.Plants[0];
        var c = await s.FounderAsync(p);
        var d = await s.FounderAsync(p);
        var moved = await s.Plants.UpdateParentsAsync(p, plant.PlantId, Parents(c, d, plant.Version, newLineName: "Other C"));

        // The client sends the response's version and the previous* values.
        var undone = await s.Plants.UpdateParentsAsync(p, plant.PlantId, new UpdateParentsRequest
        {
            MotherPlantId = moved!.PreviousMotherPlantId,
            FatherPlantId = moved.PreviousFatherPlantId,
            LineId = moved.PreviousLineId,
            Version = moved.Plant.Version,
        });

        Assert.Equal(f1.Line.Id, undone!.Plant.LineId);
        Assert.Equal(plant.PopulationId, undone.Plant.PopulationId);
        Assert.Equal(plant.Tag, undone.Plant.Tag);
        Assert.Equal(3, undone.Plant.Version);
        Assert.Equal(a.PlantId, undone.Plant.Mother!.PlantId);
    }

    [Fact]
    public async Task UpdateParents_version_goes_up_once_per_write_and_the_response_carries_the_current_row_version()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var plant = f1.Plants[0];

        var first = await s.Plants.UpdateParentsAsync(p, plant.PlantId, Parents(a, b, plant.Version, newLineName: "Second A"));
        var second = await s.Plants.UpdateParentsAsync(p, plant.PlantId, Parents(b, a, first!.Plant.Version, newLineName: "Third A"));

        Assert.Equal(2, first.Plant.Version);
        Assert.Equal(3, second!.Plant.Version);
        Assert.Equal(3, (await s.Db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == plant.PlantId)).RowVersion);
    }

    [Fact]
    public async Task UpdateParents_stale_version_409_and_missing_plant_null()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var plant = f1.Plants[0];

        await TestServices.Rejects(() => s.Plants.UpdateParentsAsync(p, plant.PlantId, Parents(a, b, plant.Version + 5)), "version_conflict", 409);
        Assert.Null(await s.Plants.UpdateParentsAsync(p, "missing", Parents(a, b, 1)));
    }

    // ---- delete ----

    [Fact]
    public async Task DeletePlant_without_children_removes_plant()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var plant = await s.FounderAsync(p);

        var result = await s.Plants.DeleteAsync(p, plant.PlantId, confirm: false);

        Assert.Equal(DeletePlantStatus.Deleted, result.Status);
        Assert.Equal(0, result.ChildCount);
        Assert.Empty(s.Db.ProjectItems);
        // The population is kept, empty.
        Assert.Equal(1, await s.Db.Populations.CountAsync());
    }

    [Fact]
    public async Task DeletePlant_missing_returns_not_found()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var result = await s.Plants.DeleteAsync(p, "missing-plant", confirm: true);

        Assert.Equal(DeletePlantStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task DeletePlant_ChildrenWithoutConfirm_409()
    {
        var (s, p, a, b, f1) = await RomaAsync();

        var result = await s.Plants.DeleteAsync(p, a.PlantId, confirm: false);

        Assert.Equal(DeletePlantStatus.HasChildren, result.Status);
        Assert.Equal(2, result.ChildCount);
        Assert.Equal(4, await s.Db.ProjectItems.CountAsync());
        Assert.NotNull(await s.Plants.GetPlantAsync(p, a.PlantId));
    }

    [Fact]
    public async Task DeletePlant_with_confirm_keeps_children_with_the_removed_tag_and_bumps_their_version()
    {
        var (s, p, a, b, f1) = await RomaAsync();

        var result = await s.Plants.DeleteAsync(p, a.PlantId, confirm: true);

        Assert.Equal(DeletePlantStatus.Deleted, result.Status);
        Assert.Equal(2, result.ChildCount);
        foreach (var child in f1.Plants)
        {
            var stored = await s.Plants.GetPlantAsync(p, child.PlantId);
            Assert.Null(stored!.Mother!.PlantId);
            Assert.True(stored.Mother.Removed);
            Assert.Equal(a.Tag, stored.Mother.Tag);
            Assert.False(stored.Father!.Removed);
            Assert.Equal(child.Label, stored.Label);
            Assert.Equal(child.Tag, stored.Tag);
            Assert.Equal(child.Version + 1, stored.Version);
        }
    }

    [Fact]
    public async Task DeletePlant_a_selfed_parent_removes_both_links()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var child = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = a.PlantId, FatherPlantId = a.PlantId, NewLineName = "Selfed A" })).Plants[0];

        var result = await s.Plants.DeleteAsync(p, a.PlantId, confirm: true);

        Assert.Equal(1, result.ChildCount);
        var stored = await s.Plants.GetPlantAsync(p, child.PlantId);
        Assert.True(stored!.Mother!.Removed);
        Assert.True(stored.Father!.Removed);
    }

    // ---- list, counts, search ----

    [Fact]
    public async Task GetPlants_pages_by_population_ordered_by_tag_with_the_paged_field_names()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var created = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 7 })).Plants;

        var page2 = await s.Plants.GetPlantsAsync(p, new PlantListQuery { PopulationId = created[0].PopulationId, Page = 2, PageSize = 3 });

        Assert.Equal(7, page2.TotalCount);
        Assert.Equal(2, page2.Page);
        Assert.Equal(3, page2.PageSize);
        Assert.Equal(new[] { "P-004", "P-005", "P-006" }, page2.Items.Select(i => i.Tag));
    }

    [Fact]
    public async Task GetPlants_parentId_lists_the_children_with_child_counts_filled()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        await s.CrossAsync(p, f1.Plants[0], f1.Plants[1]);

        var children = await s.Plants.GetPlantsAsync(p, new PlantListQuery { ParentId = f1.Plants[0].PlantId });
        var parents = await s.Plants.GetPlantsAsync(p, new PlantListQuery { ParentId = a.PlantId });

        Assert.Single(children.Items);
        Assert.Equal(2, parents.TotalCount);
        var f1Page = await s.Plants.GetPlantsAsync(p, new PlantListQuery { LineId = f1.Line.Id, PageSize = 100 });
        Assert.Equal(1, f1Page.Items.Single(i => i.PlantId == f1.Plants[0].PlantId).ChildCount);
    }

    [Fact]
    public async Task GetPlants_latestOnly_keeps_the_newest_generation_of_each_line_and_all_founders()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var f2 = (await s.CrossAsync(p, f1.Plants[0], f1.Plants[1])).Plants[0];

        var latest = await s.Plants.GetPlantsAsync(p, new PlantListQuery { LatestOnly = true, PageSize = 100 });
        var counts = await s.Plants.GetCountsAsync(p, new PlantCountsQuery { LatestOnly = true });

        Assert.Equal(new[] { a.Tag, b.Tag, f2.Tag }.OrderBy(x => x), latest.Items.Select(i => i.Tag));
        Assert.Equal(3, counts.Total);
    }

    [Fact]
    public async Task GetPlants_q_matches_tag_and_the_four_traits_ignoring_case()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "ALPHA", SeedWeight = "Heavy" });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "BETA", FruitColor = "Dark RED" });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "GAMMA", SeedColor = "red-ish" });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "DELTA", FruitWeight = "10g" });

        async Task<string[]> Find(string q) =>
            (await s.Plants.GetPlantsAsync(p, new PlantListQuery { Q = q })).Items.Select(i => i.Tag).ToArray();

        Assert.Equal(new[] { "BETA", "GAMMA" }, await Find("red"));
        Assert.Equal(new[] { "ALPHA" }, await Find("alp"));
        Assert.Equal(new[] { "ALPHA" }, await Find("heavy"));
        Assert.Equal(new[] { "DELTA" }, await Find("10g"));
    }

    [Fact]
    public async Task Search_PercentAndUnderscore_MatchLiterally()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "T1", FruitColor = "50% red" });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "T2", FruitColor = "500 red" });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "T3", FruitColor = "a_b" });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "T4", FruitColor = "axb" });

        async Task<string[]> Find(string q) =>
            (await s.Plants.GetPlantsAsync(p, new PlantListQuery { Q = q })).Items.Select(i => i.Tag).ToArray();

        Assert.Equal(new[] { "T1" }, await Find("50%"));
        Assert.Equal(new[] { "T3" }, await Find("a_b"));
        // A literal backslash is escaped too (InputRulesTests covers the pattern);
        // the in-memory provider cannot match it, so it is only checked on Postgres.
        Assert.Equal(new[] { "T1" }, await Find("%")); // only the one value that contains a percent sign
    }

    [Fact]
    public async Task GetCounts_per_line_and_population_with_q_and_the_line_filter()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var f2 = await s.CrossAsync(p, f1.Plants[0], f1.Plants[1]);

        var all = await s.Plants.GetCountsAsync(p, new PlantCountsQuery());
        var romaOnly = await s.Plants.GetCountsAsync(p, new PlantCountsQuery { LineId = f1.Line.Id });
        var searching = await s.Plants.GetCountsAsync(p, new PlantCountsQuery { Q = f2.Plants[0].Tag });

        Assert.Equal(5, all.Total);
        Assert.Equal(2, all.Lines.Count);
        Assert.Equal(3, all.Lines.Single(l => l.LineId == f1.Line.Id).Count);
        Assert.Equal(3, all.Populations.Count);
        Assert.Equal(3, romaOnly.Total);
        Assert.Single(romaOnly.Lines);
        Assert.Equal(1, searching.Total);
        Assert.Equal(f2.Plants[0].PopulationId, Assert.Single(searching.Populations).PopulationId);
    }

    [Fact]
    public async Task GetPlant_returns_null_for_a_missing_plant()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        Assert.Null(await s.Plants.GetPlantAsync(p, "missing"));
    }

    // ---- preview ----

    [Fact]
    public async Task Preview_for_no_parents_suggests_the_next_founder_tag()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.FounderAsync(p);

        var preview = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery());

        Assert.Equal("P-002", preview.SuggestedTag);
        Assert.Equal("P", preview.Label);
        Assert.Equal("Founders", preview.Line.Name);
        Assert.NotNull(preview.Line.Id);
        Assert.Equal("joins", preview.Population.Action);
        Assert.Equal(1, preview.Population.PlantCount);
        Assert.Equal("Unspecified season · No field yet", preview.Population.Name);
    }

    [Fact]
    public async Task Preview_for_a_cross_of_founders_forces_a_new_line_and_names_the_population()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);

        var preview = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery
        {
            MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Roma A", Season = "Spring", Year = 2026,
        });

        Assert.True(preview.ForcedNewLine);
        Assert.True(preview.StartsNewLine);
        Assert.Null(preview.Line.Id);
        Assert.Equal("Roma A", preview.Line.Name);
        Assert.Equal("RA-F1-001", preview.SuggestedTag);
        Assert.Equal("creates", preview.Population.Action);
        Assert.Equal(0, preview.Population.PlantCount);
        Assert.Equal("Spring 2026 · No field yet", preview.Population.Name);
        Assert.Single(preview.AllowedLineChoices);
        Assert.True(preview.AllowedLineChoices[0].IsNew);
    }

    [Fact]
    public async Task Preview_offers_the_end_of_chain_and_the_old_line_after_a_rename()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var renamed = await s.Lines.RenameLineAsync(p, f1.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });

        var preview = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = f1.Plants[0].PlantId, FatherPlantId = f1.Plants[1].PlantId });

        Assert.False(preview.ForcedNewLine);
        Assert.Equal(renamed!.NewLine.Id, preview.Line.Id);
        Assert.Equal("F2", preview.Label);
        Assert.Equal(new int?[] { renamed.NewLine.Id, f1.Line.Id, null }, preview.AllowedLineChoices.Select(c => c.LineId));
    }

    [Fact]
    public async Task Preview_WritesNothing()
    {
        var (s, p, a, b, f1) = await RomaAsync();
        var line = await s.Db.Lines.AsNoTracking().SingleAsync(l => l.Id == f1.Line.Id);
        var plants = await s.Db.ProjectItems.CountAsync();
        var populations = await s.Db.Populations.CountAsync();
        var lines = await s.Db.Lines.CountAsync();
        var origins = await s.Db.LineOrigins.CountAsync();

        await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = f1.Plants[0].PlantId, FatherPlantId = f1.Plants[1].PlantId, Season = "Summer", Year = 2030 });
        await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Brand New" });
        await s.Plants.PreviewAsync(p, new PlacementPreviewQuery());

        Assert.False(s.Db.ChangeTracker.HasChanges());
        Assert.Equal(plants, await s.Db.ProjectItems.CountAsync());
        Assert.Equal(populations, await s.Db.Populations.CountAsync());
        Assert.Equal(lines, await s.Db.Lines.CountAsync());
        Assert.Equal(origins, await s.Db.LineOrigins.CountAsync());
        Assert.Equal(line.NextSeq, (await s.Db.Lines.AsNoTracking().SingleAsync(l => l.Id == f1.Line.Id)).NextSeq);
    }

    [Fact]
    public async Task Preview_applies_the_same_rules_as_create()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);

        await TestServices.Rejects(() => s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = a.PlantId }), "one_parent");
        await TestServices.Rejects(() => s.Plants.PreviewAsync(p, new PlacementPreviewQuery { StartNewLine = true }), "no_parents_founders_only");
    }
}
