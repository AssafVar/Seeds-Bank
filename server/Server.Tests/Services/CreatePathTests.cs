using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.Tests.Controllers;

namespace SeedsBank.Server.Tests.Services;

// Round trips of the create path. The in-memory provider runs no SQL, so
// commands cannot be counted here; what can be pinned is the number of
// SaveChanges calls (one transaction, one batch) and that the answer needs no
// re-read. Command counts on MySQL belong to the local MySQL run.
public class CreatePathTests
{
    private sealed class CountingContext : AppDbContext
    {
        public CountingContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public int Saves { get; private set; }
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            Saves++;
            return base.SaveChangesAsync(cancellationToken);
        }
    }

    [Fact]
    public async Task A_500_plant_cross_is_one_SaveChanges_and_the_answer_matches_a_re_read()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new CountingContext(options);
        var s = new TestServices(db);
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var before = db.Saves;

        var result = await s.CrossAsync(p, a, b, "Roma A", count: 500);

        Assert.Equal(1, db.Saves - before); // line, origins, population and 500 plants together
        Assert.Equal(500, result.Plants.Count);
        Assert.Equal(500, result.Plants.Select(x => x.Tag).Distinct().Count());
        var reread = (await s.Plants.GetPlantsAsync(p, new PlantListQuery { LineId = result.Line.Id, PageSize = 100 })).Items;
        foreach (var fromPage in reread)
        {
            var created = result.Plants.Single(x => x.PlantId == fromPage.PlantId);
            Assert.Equal(JsonSerializer.Serialize(fromPage), JsonSerializer.Serialize(created));
        }
        Assert.Equal(500, result.Line.PlantCount);
    }

    [Fact]
    public async Task One_line_answer_equals_the_same_line_from_the_full_overview()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var roma = await s.Plants.CreateAsync(p, new CreatePlantsRequest
            { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Roma A", Count = 3, FruitColor = "red", FruitWeight = "1g", SeedColor = "x", SeedWeight = "1g" });
        await s.Plants.CreateAsync(p, new CreatePlantsRequest
            { MotherPlantId = roma.Plants[0].PlantId, FatherPlantId = roma.Plants[1].PlantId, Count = 3, FruitColor = "red", FruitWeight = "1g", SeedColor = "x", SeedWeight = "1g" });
        await s.Lines.RenameLineAsync(p, roma.Line.Id, new RenameLineRequest { NewName = "Roma Classic" });
        await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Empty" });

        var overview = await s.Lines.GetOverviewAsync(p);

        foreach (var line in overview)
        {
            var single = await s.Lines.GetLineAsync(p, line.Id);
            Assert.Equal(JsonSerializer.Serialize(line), JsonSerializer.Serialize(single));
        }
    }

    [Fact]
    public async Task Retries_back_off_but_stay_bounded()
    {
        // Six failing attempts with jitter must still finish well under a second or two.
        var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using (var seed = new AppDbContext(options)) await new TestServices(seed).ProjectAsync();
        await using var failing = new AlwaysFailing(options);
        var s = new TestServices(failing);

        var watch = Stopwatch.StartNew();
        await Assert.ThrowsAsync<PedigreeException>(() => s.Plants.CreateAsync("p1", new CreatePlantsRequest()));
        watch.Stop();

        Assert.Equal(6, failing.Saves);
        Assert.InRange(watch.ElapsedMilliseconds, 1, 3000);
    }

    private sealed class AlwaysFailing : AppDbContext
    {
        public AlwaysFailing(DbContextOptions<AppDbContext> options) : base(options) { }
        public int Saves { get; private set; }
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            Saves++;
            throw new DbUpdateException("lost race");
        }
    }

    // ---- duplicate project id ----

    [Fact]
    public async Task CreateProject_with_an_id_that_exists_is_409_with_a_fixed_message_and_creates_nothing()
    {
        var s = TestServices.Create();
        await s.ProjectAsync("u1", "p1");
        var lines = await s.Db.Lines.CountAsync();

        var other = await TestServices.Rejects(() => s.ProjectAsync("u2", "p1"), "project_id_taken", 409);
        var own = await TestServices.Rejects(() => s.ProjectAsync("u1", "p1"), "project_id_taken", 409);

        Assert.Equal(other.Message, own.Message); // does not say whose it is
        Assert.DoesNotContain("u1", other.Message);
        Assert.Equal("projectId", other.Field);
        Assert.Equal(1, await s.Db.Projects.CountAsync());
        Assert.Equal(lines, await s.Db.Lines.CountAsync());
    }

    [Fact]
    public async Task CreateNewProject_controller_maps_the_duplicate_to_409_in_shape()
    {
        var s = TestServices.Create();
        await s.ProjectAsync("u1", "p1");
        var controller = new ProjectsController(s.Projects);
        ControllerTestHelpers.SetUser(controller, "u2");

        var result = await controller.CreateNewProject("u2", new CreateProjectRequest { ProjectId = "p1", ProjectName = "x", PlantType = "y" });

        var conflict = Assert.IsType<Microsoft.AspNetCore.Mvc.ObjectResult>(result);
        Assert.Equal(409, conflict.StatusCode);
        Assert.Equal("project_id_taken", conflict.Value!.GetType().GetProperty("code")!.GetValue(conflict.Value));
        Assert.Equal(1, await s.Db.Projects.CountAsync());
    }
}
