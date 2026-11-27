using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

// The sibling rule reads origins and plants: it must only ever see the
// caller's own project, even when another user has the very same tags,
// labels and shapes.
public class SiblingIsolationTests
{
    private const string UserA = "u1", ProjectA = "pA", UserB = "u2", ProjectB = "pB";

    // Founders with the same custom tags in whichever project asks.
    private static async Task<(PlantDto One, PlantDto Two)> FoundersAsync(TestServices s, string project) =>
        (await s.FounderAsync(project, "T-A"), await s.FounderAsync(project, "T-B"));

    private static async Task<string> SnapshotAsync(TestServices s, string project) =>
        JsonSerializer.Serialize(new
        {
            Plants = await s.Db.ProjectItems.AsNoTracking().Where(i => i.ProjectId == project).OrderBy(i => i.Tag)
                .Select(i => new { i.PlantId, i.Tag, i.PopulationId, i.MotherPlantId, i.FatherPlantId, i.RowVersion }).ToListAsync(),
            Lines = await s.Db.Lines.AsNoTracking().Where(l => l.ProjectId == project).OrderBy(l => l.Id)
                .Select(l => new { l.Id, l.Name, l.NextSeq }).ToListAsync(),
            Populations = await s.Db.Populations.AsNoTracking().Where(p => p.ProjectId == project).OrderBy(p => p.Id)
                .Select(p => new { p.Id, p.LineId, p.Kind, p.Generation }).ToListAsync(),
            Origins = await s.Db.LineOrigins.AsNoTracking().Where(o => o.Line.ProjectId == project).CountAsync(),
        });

    private static string Shape(PlacementPreviewDto p) =>
        JsonSerializer.Serialize(new
        {
            p.ForcedNewLine, p.StartsNewLine, p.IsSelf, p.Label,
            Choices = p.AllowedLineChoices.Select(c => new { IsNew = c.IsNew, Named = c.LineId != null }),
            Line = p.Line.Id is null, Action = p.Population.Action, p.Population.PlantCount,
        });

    private static PlacementPreviewQuery Query(PlantDto m, PlantDto f) =>
        new() { MotherPlantId = m.PlantId, FatherPlantId = f.PlantId, NewLineName = "Roma B" };

    private static async Task<TestServices> BaselineAsync()
    {
        var s = TestServices.Create();
        await s.ProjectAsync(UserB, ProjectB);
        return s;
    }

    [Fact]
    public async Task Preview_And_Create_OtherUsersIdenticalCross_IsNeverASibling()
    {
        // Baseline: B alone.
        var alone = await BaselineAsync();
        var (aloneOne, aloneTwo) = await FoundersAsync(alone, ProjectB);
        var baselinePreview = await alone.Plants.PreviewAsync(ProjectB, Query(aloneOne, aloneTwo));
        Assert.True(baselinePreview.ForcedNewLine);

        // A has the very same founders (tags), the same cross, with plants and a line.
        var s = TestServices.Create();
        await s.ProjectAsync(UserA, ProjectA);
        await s.ProjectAsync(UserB, ProjectB);
        var (aOne, aTwo) = await FoundersAsync(s, ProjectA);
        var aLine = await s.CrossAsync(ProjectA, aOne, aTwo, "Roma A", count: 2);
        await s.CrossAsync(ProjectA, aLine.Plants[0], aLine.Plants[1]);
        var (bOne, bTwo) = await FoundersAsync(s, ProjectB);
        var before = await SnapshotAsync(s, ProjectA);

        var preview = await s.Plants.PreviewAsync(ProjectB, Query(bOne, bTwo));
        var created = await s.CrossAsync(ProjectB, bOne, bTwo, "Roma B");

        Assert.Equal(baselinePreview.ForcedNewLine, preview.ForcedNewLine);
        Assert.Equal(Shape(baselinePreview), Shape(preview));
        Assert.Equal(baselinePreview.AllowedLineChoices.Count, preview.AllowedLineChoices.Count);
        Assert.DoesNotContain(preview.AllowedLineChoices, c => c.LineId == aLine.Line.Id);
        Assert.NotEqual(aLine.Line.Id, created.Line.Id);
        Assert.Equal("Roma B", created.Line.Name);
        Assert.Equal(ProjectB, created.Plants[0].ProjectId);
        Assert.Equal(1, created.Plants[0].Generation);
        Assert.Equal(created.Line.Id, (await s.Db.Lines.AsNoTracking().SingleAsync(l => l.ProjectId == ProjectB && l.Name == "Roma B")).Id);
        Assert.Equal(before, await SnapshotAsync(s, ProjectA));
    }

    [Fact]
    public async Task Preview_And_Create_OtherUsersIdenticalSelf_IsNeverASibling()
    {
        var s = TestServices.Create();
        await s.ProjectAsync(UserA, ProjectA);
        await s.ProjectAsync(UserB, ProjectB);
        var (aOne, _) = await FoundersAsync(s, ProjectA);
        var aSelf = await s.Plants.CreateAsync(ProjectA, new CreatePlantsRequest { MotherPlantId = aOne.PlantId, FatherPlantId = aOne.PlantId, NewLineName = "Selfed" });
        var (bOne, _) = await FoundersAsync(s, ProjectB);
        var before = await SnapshotAsync(s, ProjectA);

        var preview = await s.Plants.PreviewAsync(ProjectB, new PlacementPreviewQuery { MotherPlantId = bOne.PlantId, FatherPlantId = bOne.PlantId, NewLineName = "Selfed B" });
        var created = await s.Plants.CreateAsync(ProjectB, new CreatePlantsRequest { MotherPlantId = bOne.PlantId, FatherPlantId = bOne.PlantId, NewLineName = "Selfed B" });

        Assert.True(preview.ForcedNewLine);
        Assert.Single(preview.AllowedLineChoices);
        Assert.NotEqual(aSelf.Line.Id, created.Line.Id);
        Assert.Equal(before, await SnapshotAsync(s, ProjectA));
    }

    [Fact]
    public async Task Preview_And_Create_OtherUsersLegacyLineWithTheSameParentKey_IsNeverASibling()
    {
        var s = TestServices.Create();
        await s.ProjectAsync(UserA, ProjectA);
        await s.ProjectAsync(UserB, ProjectB);
        var (aOne, aTwo) = await FoundersAsync(s, ProjectA);
        var (bOne, bTwo) = await FoundersAsync(s, ProjectB);

        // A's legacy line: no origin rows, only a plant whose parents are A's founders.
        var legacy = new Line { ProjectId = ProjectA, Name = "Legacy A", Code = "LA", NextSeq = 2 };
        var population = new Population { ProjectId = ProjectA, Line = legacy, Kind = 'F', Generation = 3 };
        s.Db.ProjectItems.Add(new ProjectItem
        {
            PlantId = "legacy-a", ProjectId = ProjectA, Tag = "LA-F3-001", Population = population,
            MotherPlantId = aOne.PlantId, FatherPlantId = aTwo.PlantId,
        });
        await s.Db.SaveChangesAsync();
        var before = await SnapshotAsync(s, ProjectA);

        var preview = await s.Plants.PreviewAsync(ProjectB, Query(bOne, bTwo));
        var created = await s.CrossAsync(ProjectB, bOne, bTwo, "Roma B");

        Assert.True(preview.ForcedNewLine);
        Assert.DoesNotContain(preview.AllowedLineChoices, c => c.LineId == legacy.Id);
        Assert.Equal(1, created.Plants[0].Generation); // not the legacy line's F3
        Assert.NotEqual(legacy.Id, created.Line.Id);
        Assert.Equal(before, await SnapshotAsync(s, ProjectA));
    }

    [Fact]
    public async Task OtherUsersLineIdAsAnExplicitSiblingChoice_IsStillRejected()
    {
        var s = TestServices.Create();
        await s.ProjectAsync(UserA, ProjectA);
        await s.ProjectAsync(UserB, ProjectB);
        var (aOne, aTwo) = await FoundersAsync(s, ProjectA);
        var aLine = await s.CrossAsync(ProjectA, aOne, aTwo, "Roma A");
        var (bOne, bTwo) = await FoundersAsync(s, ProjectB);

        // Same parent tags, A's line id: it is not B's line, sibling or not.
        await TestServices.Rejects(() => s.CrossAsync(ProjectB, bOne, bTwo, lineId: aLine.Line.Id), "line_not_found", 400);
    }
}
