using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

public class LinesOwnershipTests
{
    [Fact]
    public async Task RenameLine_LineOfOtherUser_404()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        var result = await t.S.Lines.RenameLineAsync(TwoUsers.ProjectB, t.AF1.Line.Id, new RenameLineRequest { NewName = "Taken Over" });

        Assert.Null(result);
        Assert.Equal(before, await t.SnapshotOfAAsync());
        Assert.Equal(0, await t.S.Db.Lines.CountAsync(l => l.ProjectId == TwoUsers.ProjectB && l.Name == "Taken Over"));
    }

    [Fact]
    public async Task RenameLine_FromPopulationOfOtherLine_400()
    {
        var t = await TwoUsers.CreateAsync();
        var bLine = (await t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, NewLineName = "Line B" })).Line;
        var other = (await t.S.Plants.CreateAsync(TwoUsers.ProjectB,
            new CreatePlantsRequest { MotherPlantId = t.B2.PlantId, FatherPlantId = t.B1.PlantId, NewLineName = "Other B" })).Line;
        var lines = await t.S.Db.Lines.CountAsync();

        // A population of A, one of B's other line, and one that does not exist: the same 400.
        var foreign = await TestServices.Rejects(() => t.S.Lines.RenameLineAsync(TwoUsers.ProjectB, bLine.Id,
            new RenameLineRequest { NewName = "Branch", FromPopulationId = t.AF1.Plants[0].PopulationId }), "population_not_found", 400);
        var ofOtherLine = await TestServices.Rejects(() => t.S.Lines.RenameLineAsync(TwoUsers.ProjectB, bLine.Id,
            new RenameLineRequest { NewName = "Branch", FromPopulationId = other.Populations[0].Id }), "population_not_found", 400);
        var unknown = await TestServices.Rejects(() => t.S.Lines.RenameLineAsync(TwoUsers.ProjectB, bLine.Id,
            new RenameLineRequest { NewName = "Branch", FromPopulationId = 99999 }), "population_not_found", 400);

        Assert.Equal(unknown.Message, foreign.Message);
        Assert.Equal(unknown.Message, ofOtherLine.Message);
        Assert.Equal(lines, await t.S.Db.Lines.CountAsync());
    }

    [Fact]
    public async Task SetStable_LineOfOtherUser_404_FlagUnchanged()
    {
        var t = await TwoUsers.CreateAsync();

        var result = await t.S.Lines.SetStableAsync(TwoUsers.ProjectB, t.AF1.Line.Id, true);

        Assert.Null(result);
        Assert.False((await t.S.Db.Lines.AsNoTracking().SingleAsync(l => l.Id == t.AF1.Line.Id)).IsStable);
    }

    [Fact]
    public async Task DeleteLine_LineOfOtherUser_404_NotDeleted()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        // A's Roma line has plants and A's Empty line has none: 404 for both, never 409.
        Assert.False(await t.S.Lines.DeleteLineAsync(TwoUsers.ProjectB, t.AF1.Line.Id));
        Assert.False(await t.S.Lines.DeleteLineAsync(TwoUsers.ProjectB, t.AEmptyLineId));

        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Fact]
    public async Task DeleteLine_FoundersOfOtherUser_404_NotFounders400()
    {
        var t = await TwoUsers.CreateAsync();
        var aFounders = await t.S.Db.Lines.AsNoTracking().SingleAsync(l => l.ProjectId == TwoUsers.ProjectA && l.IsFounders);

        // The state check ("Founders cannot be changed") is not reachable for a foreign line.
        Assert.False(await t.S.Lines.DeleteLineAsync(TwoUsers.ProjectB, aFounders.Id));
        Assert.Null(await t.S.Lines.SetStableAsync(TwoUsers.ProjectB, aFounders.Id, true));
        Assert.Null(await t.S.Lines.RenameLineAsync(TwoUsers.ProjectB, aFounders.Id, new RenameLineRequest { NewName = "X" }));
    }

    [Fact]
    public async Task GetLine_OfOtherUser_IsNull()
    {
        var t = await TwoUsers.CreateAsync();

        Assert.Null(await t.S.Lines.GetLineAsync(TwoUsers.ProjectB, t.AF1.Line.Id));
        Assert.DoesNotContain(await t.S.Lines.GetOverviewAsync(TwoUsers.ProjectB), l => l.Id == t.AF1.Line.Id);
    }

    [Fact]
    public async Task Overview_NeverContainsAnotherProjectsLinesOrPlants()
    {
        var t = await TwoUsers.CreateAsync();

        var json = System.Text.Json.JsonSerializer.Serialize(await t.S.Projects.GetProjectAsync(TwoUsers.UserB, TwoUsers.ProjectB));

        Assert.DoesNotContain("Roma A", json);
        Assert.DoesNotContain("Empty A", json);
        Assert.DoesNotContain(TwoUsers.SecretTag, json);
        Assert.Null(await t.S.Projects.GetProjectAsync(TwoUsers.UserB, TwoUsers.ProjectA));
    }
}
