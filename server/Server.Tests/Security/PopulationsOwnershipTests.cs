using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

public class PopulationsOwnershipTests
{
    [Fact]
    public async Task CreatePopulation_LineOfOtherUser_404or400()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        // 400 line_not_found, the same answer as an unknown line (design 5.7).
        var foreign = await TestServices.Rejects(() => t.S.Lines.CreatePopulationAsync(TwoUsers.ProjectB,
            new CreatePopulationRequest { LineId = t.AF1.Line.Id, Season = "Spring", Year = 2026 }), "line_not_found", 400);
        var unknown = await TestServices.Rejects(() => t.S.Lines.CreatePopulationAsync(TwoUsers.ProjectB,
            new CreatePopulationRequest { LineId = 99999, Season = "Spring", Year = 2026 }), "line_not_found", 400);

        Assert.Equal(unknown.Message, foreign.Message);
        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Fact]
    public async Task CreatePopulation_FieldOfOtherProject_400()
    {
        var t = await TwoUsers.CreateAsync();
        var bFounders = await t.S.Db.Lines.AsNoTracking().SingleAsync(l => l.ProjectId == TwoUsers.ProjectB && l.IsFounders);
        var populations = await t.S.Db.Populations.CountAsync();

        var foreign = await TestServices.Rejects(() => t.S.Lines.CreatePopulationAsync(TwoUsers.ProjectB,
            new CreatePopulationRequest { LineId = bFounders.Id, Season = "Spring", Year = 2026, FieldId = t.AFieldId }), "field_not_found", 400);
        var unknown = await TestServices.Rejects(() => t.S.Lines.CreatePopulationAsync(TwoUsers.ProjectB,
            new CreatePopulationRequest { LineId = bFounders.Id, Season = "Spring", Year = 2026, FieldId = 99999 }), "field_not_found", 400);

        Assert.Equal(unknown.Message, foreign.Message);
        Assert.Equal("fieldId", foreign.Field);
        Assert.Equal(populations, await t.S.Db.Populations.CountAsync());
    }

    [Fact]
    public async Task DeletePopulation_PopulationOfOtherUser_404_NotDeleted()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        // A's F1 population has plants (would be 409 for its owner), the placeholder is empty: 404 for both.
        Assert.False(await t.S.Lines.DeletePopulationAsync(TwoUsers.ProjectB, t.AF1.Plants[0].PopulationId));
        Assert.False(await t.S.Lines.DeletePopulationAsync(TwoUsers.ProjectB, t.APlaceholderId));

        Assert.Equal(before, await t.SnapshotOfAAsync());
    }
}
