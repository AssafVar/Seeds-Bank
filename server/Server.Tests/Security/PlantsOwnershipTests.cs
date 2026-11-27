using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

// Breeder B (u2) uses every id of breeder A (u1) against B's own project.
// A's data must not change, and no answer may differ from the one for an id
// that does not exist.
public class PlantsOwnershipTests
{
    private static readonly string[] Missing = { "no-such-plant" };

    // ---- single plant ----

    [Fact]
    public async Task GetPlant_PlantOfOtherUsersProject_Returns404()
    {
        var t = await TwoUsers.CreateAsync();

        Assert.Null(await t.S.Plants.GetPlantAsync(TwoUsers.ProjectB, t.AMother.PlantId));
        Assert.NotNull(await t.S.Plants.GetPlantAsync(TwoUsers.ProjectA, t.AMother.PlantId));
    }

    [Fact]
    public async Task UpdatePlant_PlantOfOtherUsersProject_Returns404()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        var result = await t.S.Plants.UpdateTraitsAsync(TwoUsers.ProjectB, t.AMother.PlantId,
            new UpdatePlantRequest { FruitColor = "hacked", Version = t.AMother.Version });

        Assert.Null(result);
        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Fact]
    public async Task UpdateParents_PlantOfOtherUsersProject_Returns404()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        var result = await t.S.Plants.UpdateParentsAsync(TwoUsers.ProjectB, t.AF1.Plants[0].PlantId,
            new UpdateParentsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, NewLineName = "Mine", Version = t.AF1.Plants[0].Version });

        Assert.Null(result);
        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Fact]
    public async Task DeletePlant_PlantOfOtherUsersProject_Returns404_AndRowIntact()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        // A's mother has children: still 404 (not 409), whatever confirm says.
        var withoutConfirm = await t.S.Plants.DeleteAsync(TwoUsers.ProjectB, t.AMother.PlantId, confirm: false);
        var withConfirm = await t.S.Plants.DeleteAsync(TwoUsers.ProjectB, t.AMother.PlantId, confirm: true);

        Assert.Equal(DeletePlantStatus.NotFound, withoutConfirm.Status);
        Assert.Equal(DeletePlantStatus.NotFound, withConfirm.Status);
        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Fact]
    public async Task DeletePlant_ChildrenUpdateScopedToProject()
    {
        var t = await TwoUsers.CreateAsync();
        // A corrupt cross-project link: a plant of B whose mother id is A's plant.
        var bFounders = await t.S.Db.Populations.FirstAsync(p => p.ProjectId == TwoUsers.ProjectB);
        t.S.Db.ProjectItems.Add(new ProjectItem
        {
            PlantId = "b-linked", ProjectId = TwoUsers.ProjectB, Tag = "B-LINK", PopulationId = bFounders.Id,
            MotherPlantId = t.AMother.PlantId, RowVersion = 7,
        });
        await t.S.Db.SaveChangesAsync();
        t.S.Db.ChangeTracker.Clear(); // a request starts with nothing tracked

        var result = await t.S.Plants.DeleteAsync(TwoUsers.ProjectA, t.AMother.PlantId, confirm: true);

        Assert.Equal(DeletePlantStatus.Deleted, result.Status);
        Assert.Equal(2, result.ChildCount); // A's two F1 plants only
        var linked = await t.S.Db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == "b-linked");
        Assert.Equal(t.AMother.PlantId, linked.MotherPlantId);
        Assert.Null(linked.MotherRemovedTag);
        Assert.Equal(7, linked.RowVersion);
    }

    // ---- lists and aggregates ----

    [Fact]
    public async Task GetPlants_ParentIdOfOtherProject_ReturnsEmptyPage_SameAsUnknownId()
    {
        var t = await TwoUsers.CreateAsync();

        var foreign = await t.S.Plants.GetPlantsAsync(TwoUsers.ProjectB, new PlantListQuery { ParentId = t.AMother.PlantId });
        var unknown = await t.S.Plants.GetPlantsAsync(TwoUsers.ProjectB, new PlantListQuery { ParentId = "no-such-plant" });

        Assert.Empty(foreign.Items);
        Assert.Equal(JsonSerializer.Serialize(unknown), JsonSerializer.Serialize(foreign));
    }

    [Fact]
    public async Task GetPlants_LineIdAndPopulationIdOfOtherUser_ReturnEmptyPages_SameAsUnknownIds()
    {
        var t = await TwoUsers.CreateAsync();

        foreach (var (foreign, unknown) in new[]
        {
            (new PlantListQuery { LineId = t.AF1.Line.Id }, new PlantListQuery { LineId = 99999 }),
            (new PlantListQuery { PopulationId = t.AF1.Plants[0].PopulationId }, new PlantListQuery { PopulationId = 99999 }),
        })
        {
            var a = await t.S.Plants.GetPlantsAsync(TwoUsers.ProjectB, foreign);
            var b = await t.S.Plants.GetPlantsAsync(TwoUsers.ProjectB, unknown);
            Assert.Empty(a.Items);
            Assert.Equal(JsonSerializer.Serialize(b), JsonSerializer.Serialize(a));
        }
    }

    [Fact]
    public async Task Counts_OnlyCountOwnProject()
    {
        var t = await TwoUsers.CreateAsync();

        var b = await t.S.Plants.GetCountsAsync(TwoUsers.ProjectB, new PlantCountsQuery());
        var a = await t.S.Plants.GetCountsAsync(TwoUsers.ProjectA, new PlantCountsQuery());

        Assert.Equal(2, b.Total);
        Assert.Equal(4, a.Total);
        var bLine = await t.S.Db.Lines.SingleAsync(l => l.ProjectId == TwoUsers.ProjectB && l.IsFounders);
        Assert.Equal(new[] { bLine.Id }, b.Lines.Select(l => l.LineId));
        var bPopulations = await t.S.Db.Populations.Where(p => p.ProjectId == TwoUsers.ProjectB).Select(p => p.Id).ToListAsync();
        Assert.All(b.Populations, p => Assert.Contains(p.PopulationId, bPopulations));
    }

    [Fact]
    public async Task Counts_LineIdOfOtherUser_ReturnsZeroSameAsUnknown()
    {
        var t = await TwoUsers.CreateAsync();

        var foreign = await t.S.Plants.GetCountsAsync(TwoUsers.ProjectB, new PlantCountsQuery { LineId = t.AF1.Line.Id });
        var unknown = await t.S.Plants.GetCountsAsync(TwoUsers.ProjectB, new PlantCountsQuery { LineId = 99999 });

        Assert.Equal(0, foreign.Total);
        Assert.Empty(foreign.Lines);
        Assert.Equal(JsonSerializer.Serialize(unknown), JsonSerializer.Serialize(foreign));
    }

    [Fact]
    public async Task Search_NeverMatchesOtherProjects()
    {
        var t = await TwoUsers.CreateAsync();
        // The same trait text in both projects.
        await t.S.Plants.CreateAsync(TwoUsers.ProjectA, new CreatePlantsRequest { FruitColor = "unique-purple" });
        await t.S.Plants.CreateAsync(TwoUsers.ProjectB, new CreatePlantsRequest { FruitColor = "unique-purple" });

        var b = await t.S.Plants.GetPlantsAsync(TwoUsers.ProjectB, new PlantListQuery { Q = "unique-purple" });
        var byTag = await t.S.Plants.GetPlantsAsync(TwoUsers.ProjectB, new PlantListQuery { Q = TwoUsers.SecretTag });
        var counts = await t.S.Plants.GetCountsAsync(TwoUsers.ProjectB, new PlantCountsQuery { Q = TwoUsers.SecretTag });

        Assert.Equal(1, b.TotalCount);
        Assert.Equal(TwoUsers.ProjectB, b.Items[0].ProjectId);
        Assert.Empty(byTag.Items);
        Assert.Equal(0, counts.Total);
        Assert.Equal(1, (await t.S.Plants.GetPlantsAsync(TwoUsers.ProjectA, new PlantListQuery { Q = TwoUsers.SecretTag })).TotalCount);
    }

    // ---- ids in a create body ----

    [Fact]
    public async Task CreatePlant_ParentFromOtherUser_400_ParentNotFound_NothingStored()
    {
        var t = await TwoUsers.CreateAsync();
        var beforeA = await t.SnapshotOfAAsync();
        var plants = await t.S.Db.ProjectItems.CountAsync();
        var lines = await t.S.Db.Lines.CountAsync();

        var ex = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.AMother.PlantId, FatherPlantId = t.B1.PlantId, NewLineName = "Stolen" }),
            "parent_not_found", 400);

        Assert.Equal("mother", ex.Field);
        Assert.Equal(plants, await t.S.Db.ProjectItems.CountAsync());
        Assert.Equal(lines, await t.S.Db.Lines.CountAsync());
        Assert.Equal(beforeA, await t.SnapshotOfAAsync());
    }

    [Fact]
    public async Task CreatePlant_ParentFromOwnOtherProject_400()
    {
        var t = await TwoUsers.CreateAsync();

        await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B2Founder.PlantId, FatherPlantId = t.B1.PlantId, NewLineName = "Cross project" }),
            "parent_not_found", 400);
        Assert.Equal(1, await t.S.Db.ProjectItems.CountAsync(i => i.ProjectId == TwoUsers.ProjectB2));
    }

    [Fact]
    public async Task ParentNotFound_MessageDoesNotContainForeignTag()
    {
        var t = await TwoUsers.CreateAsync();

        var ex = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.AMother.PlantId, FatherPlantId = t.B1.PlantId }), "parent_not_found");

        Assert.DoesNotContain(TwoUsers.SecretTag, ex.Message);
        Assert.DoesNotContain(t.AMother.Tag, ex.Message);
        Assert.DoesNotContain("Roma", ex.Message);
    }

    [Fact]
    public async Task CreatePlant_LineIdOfOtherUser_400_SameAsUnknownLine()
    {
        var t = await TwoUsers.CreateAsync();

        var foreign = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, LineId = t.AF1.Line.Id }), "line_not_found", 400);
        var unknown = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, LineId = 99999 }), "line_not_found", 400);

        Assert.Equal(unknown.Message, foreign.Message);
        Assert.Equal(unknown.Field, foreign.Field);
    }

    [Fact]
    public async Task CreatePlant_EmptyLineOfOtherUser_NotWritten()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, LineId = t.AEmptyLineId }), "line_not_found", 400);

        Assert.Equal(before, await t.SnapshotOfAAsync());
        Assert.Equal(0, await t.S.Db.LineOrigins.CountAsync(o => o.LineId == t.AEmptyLineId));
    }

    [Fact]
    public async Task CreatePlant_NoParents_LineIdOfNamedLine_400()
    {
        var t = await TwoUsers.CreateAsync();
        var bLine = (await t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, NewLineName = "Named B" })).Line;

        var own = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB, new CreatePlantsRequest { LineId = bLine.Id }), "no_parents_founders_only", 400);
        var foreign = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB, new CreatePlantsRequest { LineId = t.AF1.Line.Id }), "no_parents_founders_only", 400);

        Assert.Equal("line", own.Field);
        Assert.Equal(own.Message, foreign.Message);
    }

    [Fact]
    public async Task CreatePlant_NoParents_StartNewLine_400()
    {
        var t = await TwoUsers.CreateAsync();

        await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB, new CreatePlantsRequest { StartNewLine = true, NewLineName = "Nope" }),
            "no_parents_founders_only", 400);
        Assert.Equal(2, await t.S.Db.ProjectItems.CountAsync(i => i.ProjectId == TwoUsers.ProjectB));
    }

    [Fact]
    public async Task CreatePlant_PopulationIdOfOtherUser_400_NothingAdopted()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        var ex = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { PopulationId = t.APlaceholderId }), "population_not_found", 400);

        Assert.Equal("populationId", ex.Field);
        Assert.Equal(before, await t.SnapshotOfAAsync());
        Assert.Null((await t.S.Db.Populations.AsNoTracking().SingleAsync(p => p.Id == t.APlaceholderId)).Kind);
    }

    [Fact]
    public async Task Preview_PopulationIdOfOtherUser_NoPlantCountLeak()
    {
        var t = await TwoUsers.CreateAsync();

        var foreign = await TestServices.Rejects(() => t.S.Plants.PreviewAsync(TwoUsers.ProjectB,
            new PlacementPreviewQuery { PopulationId = t.AF1.Plants[0].PopulationId }), "population_not_found", 400);
        var unknown = await TestServices.Rejects(() => t.S.Plants.PreviewAsync(TwoUsers.ProjectB,
            new PlacementPreviewQuery { PopulationId = 99999 }), "population_not_found", 400);

        Assert.Equal(unknown.Message, foreign.Message);
    }

    [Fact]
    public async Task Preview_LineAndParentOfOtherUser_NoLeak()
    {
        var t = await TwoUsers.CreateAsync();

        await TestServices.Rejects(() => t.S.Plants.PreviewAsync(TwoUsers.ProjectB,
            new PlacementPreviewQuery { MotherPlantId = t.AMother.PlantId, FatherPlantId = t.B1.PlantId }), "parent_not_found", 400);
        await TestServices.Rejects(() => t.S.Plants.PreviewAsync(TwoUsers.ProjectB,
            new PlacementPreviewQuery { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, LineId = t.AF1.Line.Id }), "line_not_found", 400);
        await TestServices.Rejects(() => t.S.Plants.PreviewAsync(TwoUsers.ProjectB,
            new PlacementPreviewQuery { FieldId = t.AFieldId }), "field_not_found", 400);
    }

    [Fact]
    public async Task CreatePlant_FieldOfOtherProject_400()
    {
        var t = await TwoUsers.CreateAsync();
        var plants = await t.S.Db.ProjectItems.CountAsync();

        var ex = await TestServices.Rejects(() => t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { FieldId = t.AFieldId, Season = "Spring", Year = 2026 }), "field_not_found", 400);

        Assert.Equal("fieldId", ex.Field);
        Assert.Equal(plants, await t.S.Db.ProjectItems.CountAsync());
        // Its own field works.
        var own = await t.S.Plants.CreateAsync(TwoUsers.ProjectB, new CreatePlantsRequest { FieldId = t.BFieldId, Season = "Spring", Year = 2026 });
        Assert.Equal("Spring 2026 · Field of B", own.Line.Populations.Single(p => p.Id == own.Plants[0].PopulationId).Name);
    }

    [Fact]
    public async Task FieldNameNotReturnedForForeignField()
    {
        var t = await TwoUsers.CreateAsync();
        // Even a corrupt row of B that points at A's field never shows its name.
        var population = await t.S.Db.Populations.FirstAsync(p => p.ProjectId == TwoUsers.ProjectB);
        population.FieldId = t.AFieldId;
        await t.S.Db.SaveChangesAsync();

        var overview = await t.S.Projects.GetProjectAsync(TwoUsers.UserB, TwoUsers.ProjectB);
        var json = JsonSerializer.Serialize(overview);

        Assert.DoesNotContain("Secret field of A", json);
        Assert.All(overview!.Lines.SelectMany(l => l.Populations), p => Assert.Null(p.FieldName));
    }

    [Fact]
    public async Task TagTaken_OnlyReportsOwnProjectTags()
    {
        var t = await TwoUsers.CreateAsync();

        // The same tag in another user's project does not conflict ...
        var first = await t.S.FounderAsync(TwoUsers.ProjectB, TwoUsers.SecretTag);
        Assert.Equal(TwoUsers.SecretTag, first.Tag);

        // ... and a conflict only ever names the caller's own tag.
        var ex = await TestServices.Rejects(() => t.S.FounderAsync(TwoUsers.ProjectB, TwoUsers.SecretTag.ToLowerInvariant()), "tag_taken", 409);
        Assert.Equal("tag", ex.Field);
        Assert.Equal($"The tag {TwoUsers.SecretTag.ToLowerInvariant()} is already used in this project.", ex.Message);
    }

    // ---- ids in an edit-parents body ----

    private static async Task<PlantDto> BPlantAsync(TwoUsers t) =>
        (await t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, NewLineName = "Line B" })).Plants[0];

    [Fact]
    public async Task UpdateParents_ParentFromOtherUser_400()
    {
        var t = await TwoUsers.CreateAsync();
        var plant = await BPlantAsync(t);

        var ex = await TestServices.Rejects(() => t.S.Plants.UpdateParentsAsync(TwoUsers.ProjectB, plant.PlantId,
            new UpdateParentsRequest { MotherPlantId = t.AMother.PlantId, FatherPlantId = t.B1.PlantId, NewLineName = "X", Version = plant.Version }),
            "parent_not_found", 400);

        Assert.DoesNotContain(TwoUsers.SecretTag, ex.Message);
        Assert.Equal(plant.Version, (await t.S.Plants.GetPlantAsync(TwoUsers.ProjectB, plant.PlantId))!.Version);
    }

    [Fact]
    public async Task UpdateParents_LineIdOfOtherUser_400()
    {
        var t = await TwoUsers.CreateAsync();
        var plant = await BPlantAsync(t);
        var before = await t.SnapshotOfAAsync();

        await TestServices.Rejects(() => t.S.Plants.UpdateParentsAsync(TwoUsers.ProjectB, plant.PlantId,
            new UpdateParentsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, LineId = t.AF1.Line.Id, Version = plant.Version }),
            "line_not_found", 400);

        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Fact]
    public async Task UpdateParents_UndoWithForeignPreviousLineId_400()
    {
        var t = await TwoUsers.CreateAsync();
        var plant = await BPlantAsync(t);
        var moved = await t.S.Plants.UpdateParentsAsync(TwoUsers.ProjectB, plant.PlantId,
            new UpdateParentsRequest { MotherPlantId = t.B2.PlantId, FatherPlantId = t.B1.PlantId, NewLineName = "Line B2", Version = plant.Version });

        // The client echoes previousLineId back; a forged one is as unknown as any other.
        await TestServices.Rejects(() => t.S.Plants.UpdateParentsAsync(TwoUsers.ProjectB, plant.PlantId, new UpdateParentsRequest
        {
            MotherPlantId = moved!.PreviousMotherPlantId,
            FatherPlantId = moved.PreviousFatherPlantId,
            LineId = t.AEmptyLineId,
            Version = moved.Plant.Version,
        }), "line_not_found", 400);
    }

    // ---- mass assignment ----

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task CreatePlant_ExtraJsonFields_Ignored()
    {
        var t = await TwoUsers.CreateAsync();
        const string body = """
            {"userId":"u1","projectId":"pA","plantId":"chosen-id","kind":"S","generation":9,"code":"ZZ","isFounders":false,
             "nextSeq":500,"rowVersion":77,"version":77,"childCount":5,"createdAt":"2000-01-01T00:00:00Z","successorLineId":1,
             "isStable":true,"lineId":null,"populationId":null,"count":1,"fruitColor":"red"}
            """;
        var request = JsonSerializer.Deserialize<CreatePlantsRequest>(body, Web)!;

        var result = await t.S.Plants.CreateAsync(TwoUsers.ProjectB, request);

        var plant = result.Plants[0];
        var stored = await t.S.Db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == plant.PlantId);
        Assert.Equal(TwoUsers.ProjectB, stored.ProjectId);
        Assert.NotEqual("chosen-id", stored.PlantId);
        Assert.Equal(1, stored.RowVersion);
        Assert.True(stored.CreatedAt > DateTime.UtcNow.AddMinutes(-5));
        var population = await t.S.Db.Populations.AsNoTracking().SingleAsync(p => p.Id == stored.PopulationId);
        Assert.Equal('P', population.Kind);
        Assert.Equal(0, population.Generation);
        var line = await t.S.Db.Lines.AsNoTracking().SingleAsync(l => l.Id == population.LineId);
        Assert.Equal("P", line.Code);
        Assert.True(line.IsFounders);
        Assert.False(line.IsStable);
        Assert.Null(line.SuccessorLineId);
        Assert.Equal(4, line.NextSeq); // b1, b2, and this one
        Assert.Equal(0, plant.ChildCount);
        Assert.Equal("red", plant.FruitColor);
    }

    [Fact]
    public async Task UpdateTraits_CannotChangeTagLineGenerationParents()
    {
        var t = await TwoUsers.CreateAsync();
        var plant = await BPlantAsync(t);
        var body = $$"""
            {"tag":"HACKED","lineId":{{t.AF1.Line.Id}},"populationId":{{t.AF1.Plants[0].PopulationId}},"generation":9,"kind":"S",
             "motherPlantId":"{{t.B2.PlantId}}","fatherPlantId":"{{t.AMother.PlantId}}","projectId":"pA","plantId":"other","fruitColor":"green","version":1}
            """;
        var request = JsonSerializer.Deserialize<UpdatePlantRequest>(body, Web)!;

        var updated = await t.S.Plants.UpdateTraitsAsync(TwoUsers.ProjectB, plant.PlantId, request);

        Assert.Equal("green", updated!.FruitColor);
        Assert.Equal(plant.Tag, updated.Tag);
        Assert.Equal(plant.LineId, updated.LineId);
        Assert.Equal(plant.PopulationId, updated.PopulationId);
        Assert.Equal(plant.Generation, updated.Generation);
        Assert.Equal(plant.Mother!.PlantId, updated.Mother!.PlantId);
        Assert.Equal(plant.Father!.PlantId, updated.Father!.PlantId);
        Assert.Equal(plant.PlantId, updated.PlantId);
    }

    [Fact]
    public async Task UpdateTraits_CannotMovePlantToOtherProject()
    {
        var t = await TwoUsers.CreateAsync();
        var request = JsonSerializer.Deserialize<UpdatePlantRequest>("""{"projectId":"pA","fruitColor":"moved","version":1}""", Web)!;

        var updated = await t.S.Plants.UpdateTraitsAsync(TwoUsers.ProjectB, t.B1.PlantId, request);

        Assert.Equal(TwoUsers.ProjectB, updated!.ProjectId);
        Assert.Equal(TwoUsers.ProjectB, (await t.S.Db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == t.B1.PlantId)).ProjectId);
    }

    [Fact]
    public void Request_types_expose_none_of_the_server_owned_fields()
    {
        var forbidden = new[]
        {
            "UserId", "ProjectId", "PlantId", "Kind", "Generation", "Code", "IsFounders", "NextSeq", "RowVersion",
            "SuccessorLineId", "ChildCount", "CreatedAt", "StableMarkedAt",
        };
        var requests = new[]
        {
            typeof(CreatePlantsRequest), typeof(UpdatePlantRequest), typeof(UpdateParentsRequest), typeof(CreateLineRequest),
            typeof(RenameLineRequest), typeof(SetStableRequest), typeof(CreatePopulationRequest), typeof(PlantListQuery),
            typeof(PlantCountsQuery), typeof(PlacementPreviewQuery),
        };

        foreach (var type in requests)
        {
            var names = type.GetProperties().Select(p => p.Name).ToHashSet();
            Assert.Empty(names.Intersect(forbidden));
        }

        // Tag only on create; isStable only on its own request.
        Assert.DoesNotContain(typeof(UpdatePlantRequest).GetProperties(), p => p.Name == "Tag");
        Assert.DoesNotContain(typeof(UpdateParentsRequest).GetProperties(), p => p.Name == "Tag");
        Assert.DoesNotContain(typeof(CreatePlantsRequest).GetProperties(), p => p.Name == "IsStable");
        Assert.Contains(typeof(SetStableRequest).GetProperties(), p => p.Name == "IsStable");
    }
}
