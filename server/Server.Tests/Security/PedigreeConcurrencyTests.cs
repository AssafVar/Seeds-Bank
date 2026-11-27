using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

public class PedigreeConcurrencyTests
{
    // The in-memory provider applies a failing save half way, which a real
    // database transaction never does. So these two contexts model the
    // database: `Before` is the other request that commits first, and then the
    // write that read stale data is rejected as a whole.
    private sealed class RacingContext : AppDbContext
    {
        public RacingContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public Func<Task>? Before { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var before = Before;
            Before = null;
            if (before is null) return await base.SaveChangesAsync(cancellationToken);

            await before();
            throw new DbUpdateConcurrencyException("The row was changed by another request.");
        }
    }

    // A single-row write: the in-memory provider's own token check is exact here.
    private sealed class RowRacingContext : AppDbContext
    {
        public RowRacingContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public Func<Task>? Before { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var before = Before;
            Before = null;
            if (before is not null) await before();
            return await base.SaveChangesAsync(cancellationToken);
        }
    }

    // Fails every save the way a lost unique-index race would, with text a
    // client must never see.
    private sealed class FailingContext : AppDbContext
    {
        public FailingContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public int Saves { get; private set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            Saves++;
            throw new DbUpdateException("Duplicate entry 'SECRET-A-TAG' for key 'IX_project_items_project_id_tag' (INSERT INTO project_items ...)");
        }
    }

    private static DbContextOptions<AppDbContext> SharedOptions() =>
        new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;

    private static TestServices ServicesOn(AppDbContext db, PedigreeOptions? options = null) => new(db, options);

    [Fact]
    public async Task ParallelCreates_NoDuplicateTags()
    {
        var options = SharedOptions();
        await using var other = new AppDbContext(options);
        await using var racing = new RacingContext(options);
        var otherServices = ServicesOn(other);
        var racingServices = ServicesOn(racing);
        var p = await otherServices.ProjectAsync();

        // The other request takes P-001 between this request's read of the
        // line counter and its save.
        racing.Before = async () => await otherServices.FounderAsync(p);
        var mine = await racingServices.FounderAsync(p);

        await using var check = new AppDbContext(options);
        var tags = await check.ProjectItems.Select(i => i.Tag).ToListAsync();
        Assert.Equal(2, tags.Count);
        Assert.Equal(2, tags.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.Equal("P-002", mine.Tag);
        Assert.Equal(3, (await check.Lines.SingleAsync(l => l.IsFounders)).NextSeq);
    }

    [Fact]
    public async Task ParallelCreates_ManyRounds_EndWithUniqueTags()
    {
        var options = SharedOptions();
        await using var other = new AppDbContext(options);
        await using var racing = new RacingContext(options);
        var otherServices = ServicesOn(other);
        var racingServices = ServicesOn(racing);
        var p = await otherServices.ProjectAsync();

        for (var i = 0; i < 10; i++)
        {
            // Every request has its own context: the competitor starts fresh each round.
            racing.Before = async () =>
            {
                await using var competitor = new AppDbContext(options);
                await ServicesOn(competitor).Plants.CreateAsync(p, new CreatePlantsRequest { Count = 2 });
            };
            await racingServices.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 3 });
        }

        await using var check = new AppDbContext(options);
        var tags = await check.ProjectItems.Select(i => i.Tag).ToListAsync();
        Assert.Equal(50, tags.Count);
        Assert.Equal(50, tags.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.Equal(51, (await check.Lines.SingleAsync(l => l.IsFounders)).NextSeq);
    }

    [Fact]
    public async Task RaceSurvivingRetries_Returns409_NoSqlText()
    {
        var options = SharedOptions();
        await using (var seed = new AppDbContext(options))
        {
            await ServicesOn(seed).ProjectAsync();
        }
        await using var failing = new FailingContext(options);
        var s = ServicesOn(failing);

        var ex = await Assert.ThrowsAsync<PedigreeException>(() => s.Plants.CreateAsync("p1", new CreatePlantsRequest()));

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("write_conflict", ex.Code);
        Assert.Equal("That could not be saved because of a simultaneous change. Try again.", ex.Message);
        foreach (var leak in new[] { "SECRET", "Duplicate", "INSERT", "IX_", "project_items", "DbUpdate" })
        {
            Assert.DoesNotContain(leak, ex.Message);
        }
        Assert.Equal(3, failing.Saves); // retried three times
        Assert.False(failing.ChangeTracker.Entries().Any(), "nothing is left half-tracked");
    }

    [Fact]
    public async Task FailedWrites_of_every_kind_leave_nothing_to_be_saved_by_the_next_call()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);

        // A rule violation thrown after a new line was already added to the context.
        await TestServices.Rejects(() => s.CrossAsync(p, a, b, "Roma A", count: 1000), "invalid_input");
        await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest
            { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, NewLineName = "Roma A", Tag = "x y" }), "invalid_tag");
        var first = await s.CrossAsync(p, a, b, "Roma A");
        await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest
            { MotherPlantId = a.PlantId, FatherPlantId = b.PlantId, StartNewLine = true, NewLineName = "roma a" }), "line_name_taken");
        await s.FounderAsync(p); // an unrelated save afterwards

        Assert.Equal(2, await s.Db.Lines.CountAsync());
        Assert.Equal(4, await s.Db.ProjectItems.CountAsync());
        Assert.Equal(first.Line.Id, (await s.Db.Lines.SingleAsync(l => l.Name == "Roma A")).Id);
    }

    [Fact]
    public async Task UpdateTraits_StaleVersion_409_NothingChanged()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var plant = await s.FounderAsync(p, fruitColor: "red");

        // A forged "version + 1" (the old undo trick) is stale too.
        await TestServices.Rejects(() => s.Plants.UpdateTraitsAsync(p, plant.PlantId,
            new UpdatePlantRequest { FruitColor = "forged", Version = plant.Version + 1 }), "version_conflict", 409);
        await TestServices.Rejects(() => s.Plants.UpdateTraitsAsync(p, plant.PlantId,
            new UpdatePlantRequest { FruitColor = "forged", Version = int.MaxValue }), "version_conflict", 409);

        var stored = await s.Db.ProjectItems.AsNoTracking().SingleAsync();
        Assert.Equal("red", stored.FruitColor);
        Assert.Equal(1, stored.RowVersion);
    }

    [Fact]
    public async Task UpdateTraits_StaleVersionAtTheDatabase_409_NothingChanged()
    {
        // Two requests both read version 1; the second one to save loses.
        var options = SharedOptions();
        await using var other = new AppDbContext(options);
        await using var racing = new RowRacingContext(options);
        var otherServices = ServicesOn(other);
        var racingServices = ServicesOn(racing);
        var p = await otherServices.ProjectAsync();
        var plant = await otherServices.FounderAsync(p, fruitColor: "red");

        racing.Before = async () => await otherServices.Plants.UpdateTraitsAsync(p, plant.PlantId, new UpdatePlantRequest { FruitColor = "winner", Version = 1 });
        await TestServices.Rejects(() => racingServices.Plants.UpdateTraitsAsync(p, plant.PlantId,
            new UpdatePlantRequest { FruitColor = "loser", Version = 1 }), "version_conflict", 409);

        await using var check = new AppDbContext(options);
        var stored = await check.ProjectItems.SingleAsync();
        Assert.Equal("winner", stored.FruitColor);
        Assert.Equal(2, stored.RowVersion);
    }

    [Fact]
    public async Task UpdateParents_StaleVersion_409()
    {
        var t = await TwoUsers.CreateAsync();
        var plant = t.AF1.Plants[0];
        await t.S.Plants.UpdateTraitsAsync(TwoUsers.ProjectA, plant.PlantId, new UpdatePlantRequest { FruitColor = "x", Version = plant.Version });

        await TestServices.Rejects(() => t.S.Plants.UpdateParentsAsync(TwoUsers.ProjectA, plant.PlantId,
            new UpdateParentsRequest { MotherPlantId = t.AMother.PlantId, FatherPlantId = t.AFather.PlantId, LineId = t.AF1.Line.Id, Version = plant.Version }),
            "version_conflict", 409);
    }

    [Fact]
    public async Task UpdateTraits_VersionOfOtherPlantIrrelevant()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var one = await s.FounderAsync(p);
        var two = await s.FounderAsync(p);
        await s.Plants.UpdateTraitsAsync(p, one.PlantId, new UpdatePlantRequest { FruitColor = "a", Version = 1 });
        await s.Plants.UpdateTraitsAsync(p, one.PlantId, new UpdatePlantRequest { FruitColor = "b", Version = 2 });

        // `one` is at version 3, `two` still at 1: versions belong to their rows.
        await TestServices.Rejects(() => s.Plants.UpdateTraitsAsync(p, two.PlantId,
            new UpdatePlantRequest { FruitColor = "c", Version = 3 }), "version_conflict", 409);
        var ok = await s.Plants.UpdateTraitsAsync(p, two.PlantId, new UpdatePlantRequest { FruitColor = "c", Version = 1 });

        Assert.Equal(2, ok!.Version);
        Assert.Equal(3, (await s.Plants.GetPlantAsync(p, one.PlantId))!.Version);
    }

    // ---- ancestor walk through the service ----

    private static async Task<(TestServices S, string P, PlantDto Target)> WorldAsync(PedigreeOptions? options = null)
    {
        var s = TestServices.Create(options);
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var target = (await s.CrossAsync(p, a, b, "Target line")).Plants[0];
        return (s, p, target);
    }

    [Fact]
    public async Task AncestorWalk_LegacyCycle_Terminates()
    {
        var (s, p, target) = await WorldAsync();
        var population = await s.Db.Populations.FirstAsync(x => x.ProjectId == p);
        // Legacy rows that loop: X's mother is Y and Y's mother is X.
        s.Db.ProjectItems.AddRange(
            new ProjectItem { PlantId = "x", ProjectId = p, Tag = "LOOP-X", PopulationId = population.Id, MotherPlantId = "y", FatherPlantId = "y" },
            new ProjectItem { PlantId = "y", ProjectId = p, Tag = "LOOP-Y", PopulationId = population.Id, MotherPlantId = "x", FatherPlantId = "x" });
        await s.Db.SaveChangesAsync();

        var done = s.Plants.UpdateParentsAsync(p, target.PlantId,
            new UpdateParentsRequest { MotherPlantId = "x", FatherPlantId = "y", NewLineName = "From loop", Version = target.Version });

        Assert.Same(done, await Task.WhenAny(done, Task.Delay(TimeSpan.FromSeconds(20))));
        Assert.NotNull((await done)!.Plant); // not a descendant of the target: accepted, and it ended
    }

    [Fact]
    public async Task AncestorWalk_DepthOverCap_Rejects400_NotAccepts()
    {
        var (s, p, target) = await WorldAsync(new PedigreeOptions { MaxAncestorDepth = 2 });
        var root = await s.FounderAsync(p);
        var chain = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = root.PlantId, FatherPlantId = root.PlantId, NewLineName = "Chain" })).Plants[0];
        for (var i = 0; i < 4; i++)
        {
            chain = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = chain.PlantId, FatherPlantId = chain.PlantId })).Plants[0];
        }

        // `chain` is five generations above root; its ancestors are deeper than the cap.
        var ex = await TestServices.Rejects(() => s.Plants.UpdateParentsAsync(p, target.PlantId,
            new UpdateParentsRequest { MotherPlantId = chain.PlantId, FatherPlantId = chain.PlantId, NewLineName = "Deep", Version = target.Version }),
            "pedigree_too_deep", 400);

        Assert.Null(ex.Field);
        Assert.Equal(target.Version, (await s.Plants.GetPlantAsync(p, target.PlantId))!.Version);
    }

    [Fact]
    public async Task AncestorWalk_NodeOverCap_Rejects400_NotAccepts()
    {
        var (s, p, target) = await WorldAsync(new PedigreeOptions { MaxAncestorNodes = 3 });
        var root = await s.FounderAsync(p);
        var chain = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = root.PlantId, FatherPlantId = root.PlantId, NewLineName = "Chain" })).Plants[0];
        for (var i = 0; i < 3; i++)
        {
            chain = (await s.Plants.CreateAsync(p, new CreatePlantsRequest { MotherPlantId = chain.PlantId, FatherPlantId = chain.PlantId })).Plants[0];
        }

        await TestServices.Rejects(() => s.Plants.UpdateParentsAsync(p, target.PlantId,
            new UpdateParentsRequest { MotherPlantId = chain.PlantId, FatherPlantId = chain.PlantId, NewLineName = "Deep", Version = target.Version }),
            "pedigree_too_deep", 400);
    }

    [Fact]
    public async Task AncestorWalk_DoesNotLoadOtherProjectsEdges()
    {
        var t = await TwoUsers.CreateAsync();

        var edgesB = await new ProjectScope(t.S.Db, TwoUsers.ProjectB).LoadParentEdgesAsync();
        var edgesA = await new ProjectScope(t.S.Db, TwoUsers.ProjectA).LoadParentEdgesAsync();

        Assert.Equal(2, edgesB.Count);
        Assert.Equal(new[] { t.B1.PlantId, t.B2.PlantId }.OrderBy(x => x), edgesB.Keys.OrderBy(x => x));
        Assert.DoesNotContain(edgesB.Keys, k => edgesA.ContainsKey(k));
        Assert.Equal(4, edgesA.Count);
    }
}
