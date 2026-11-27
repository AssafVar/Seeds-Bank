using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services;

// F7: a new line needs no name from the user; the default is built from the
// parents' tags and made unique in the project.
public class DefaultLineNameTests
{
    private static Task<CreatePlantsResponse> Cross(TestServices s, string p, PlantDto m, PlantDto f, bool startNew = false) =>
        s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = m.PlantId, FatherPlantId = f.PlantId, StartNewLine = startNew });

    [Fact]
    public async Task Two_different_founder_pairs_make_two_lines_with_different_names_and_no_name_sent()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p, "A1");
        var b = await s.FounderAsync(p, "B1");
        var c = await s.FounderAsync(p, "C1");
        var d = await s.FounderAsync(p, "D1");

        var one = await Cross(s, p, a, b);
        var two = await Cross(s, p, c, d);

        Assert.Equal("A1 x B1", one.Line.Name);
        Assert.Equal("C1 x D1", two.Line.Name);
        Assert.NotEqual(one.Line.Id, two.Line.Id);
    }

    [Fact]
    public async Task A_founder_self_gets_a_selfed_name_and_a_second_pair_with_a_taken_default_gets_suffix_2()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p, "A1");
        var b = await s.FounderAsync(p, "B1");

        var selfed = await Cross(s, p, a, a);
        var first = await Cross(s, p, a, b);
        var second = await Cross(s, p, a, b, startNew: true); // default "A1 x B1" is taken
        var third = await Cross(s, p, a, b, startNew: true);

        Assert.Equal("A1 selfed", selfed.Line.Name);
        Assert.Equal("A1 x B1", first.Line.Name);
        Assert.Equal("A1 x B1 2", second.Line.Name);
        Assert.Equal("A1 x B1 3", third.Line.Name);
    }

    [Fact]
    public async Task Tags_with_dots_and_underscores_are_cleaned_and_a_long_name_is_cut_with_the_suffix_kept()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p, "A.1_x");
        var b = await s.FounderAsync(p, new string('Z', 24));
        var c = await s.FounderAsync(p, new string('Y', 24));

        var cleaned = await Cross(s, p, a, a);
        var longName = await Cross(s, p, b, c);
        var longAgain = await Cross(s, p, b, c, startNew: true);

        Assert.Equal("A-1-x selfed", cleaned.Line.Name);
        Assert.Equal(40, longName.Line.Name.Length);
        Assert.InRange(longAgain.Line.Name.Length, 1, 40);
        Assert.EndsWith(" 2", longAgain.Line.Name);
        Assert.NotEqual(longName.Line.Name, longAgain.Line.Name);
    }

    [Fact]
    public async Task Default_names_match_case_insensitively_like_the_unique_index()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p, "A1");
        var b = await s.FounderAsync(p, "B1");
        await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "a1 x b1" });

        var created = await Cross(s, p, a, b);

        Assert.Equal("A1 x B1 2", created.Line.Name);
    }

    [Fact]
    public async Task Preview_returns_200_with_the_suggested_unique_name_and_never_409_for_a_default()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p, "A1");
        var b = await s.FounderAsync(p, "B1");
        await Cross(s, p, a, b);

        var preview = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true });
        var self = await s.Plants.PreviewAsync(p, new PlacementPreviewQuery { MotherPlantId = b.PlantId, FatherPlantId = b.PlantId });

        Assert.Equal("A1 x B1 2", preview.Line.Name);
        Assert.Null(preview.Line.Id);
        Assert.Equal("B1 selfed", self.Line.Name);
        Assert.Equal(await s.Db.Lines.CountAsync(), 2); // nothing written
    }

    [Fact]
    public async Task An_explicit_taken_name_is_still_409_on_create_and_on_preview()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p, "A1");
        var b = await s.FounderAsync(p, "B1");
        await s.CrossAsync(p, a, b, "Roma A");

        await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest
            { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true, NewLineName = "ROMA a" }), "line_name_taken", 409);
        // Preview of an explicit taken name is a lineName field error (409), by design: the user typed it.
        await TestServices.Rejects(() => s.Plants.PreviewAsync(p, new PlacementPreviewQuery
            { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true, NewLineName = "roma a" }), "line_name_taken", 409);
    }

    // Models the database: the other request commits first, then this save is
    // rejected as a whole by the unique index on (project, name).
    private sealed class LosingContext : AppDbContext
    {
        public LosingContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public Func<Task>? Before { get; set; }
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var before = Before;
            Before = null;
            if (before is null) return await base.SaveChangesAsync(cancellationToken);
            await before();
            throw new DbUpdateException("Duplicate entry for key IX_lines_project_id_name");
        }
    }

    [Fact]
    public async Task Two_creates_racing_for_the_same_default_name_do_not_500_the_loser_takes_the_next_suffix()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var other = new AppDbContext(options);
        await using var losing = new LosingContext(options);
        var otherServices = new TestServices(other);
        var losingServices = new TestServices(losing);
        var p = await otherServices.ProjectAsync();
        var a = await otherServices.FounderAsync(p, "A1");
        var b = await otherServices.FounderAsync(p, "B1");

        losing.Before = async () =>
        {
            await using var winner = new AppDbContext(options);
            await Cross(new TestServices(winner), p, a, b);
        };
        var loser = await Cross(losingServices, p, a, b, startNew: true);

        await using var check = new AppDbContext(options);
        var names = await check.Lines.Where(l => !l.IsFounders).Select(l => l.Name).OrderBy(n => n).ToListAsync();
        // The winner took "A1 x B1"; the loser's retry sees it and joins that sibling line... or, as startNew was asked, takes " 2".
        Assert.Contains("A1 x B1", names);
        Assert.Contains("A1 x B1 2", names);
        Assert.Equal("A1 x B1 2", loser.Line.Name);
    }
}
