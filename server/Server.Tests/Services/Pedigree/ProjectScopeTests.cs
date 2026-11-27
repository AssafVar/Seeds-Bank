using SeedsBank.Server.Models;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class ProjectScopeTests
{
    // Two users' projects with the same shape; the ids of project B must never
    // resolve through project A's scope.
    private static async Task<(SeedsBank.Server.Data.AppDbContext Db, int LineA, int LineB, int PopA, int PopB)> SeedAsync()
    {
        var db = TestDbContextFactory.Create();
        db.Projects.AddRange(
            new Project { ProjectId = "pa", UserId = "ua", ProjectName = "A", PlantType = "x" },
            new Project { ProjectId = "pb", UserId = "ub", ProjectName = "B", PlantType = "x" });
        var la = new Line { ProjectId = "pa", Name = "Roma", Code = "ROM" };
        var lb = new Line { ProjectId = "pb", Name = "Roma", Code = "ROM" };
        db.Lines.AddRange(la, lb);
        await db.SaveChangesAsync();

        var popA = new Population { ProjectId = "pa", LineId = la.Id, Kind = 'P', Generation = 0 };
        var popB = new Population { ProjectId = "pb", LineId = lb.Id, Kind = 'P', Generation = 0 };
        db.Populations.AddRange(popA, popB);
        db.Fields.Add(new Field { ProjectId = "pb", Name = "Secret field", VerticesJson = "[]" });
        await db.SaveChangesAsync();

        db.ProjectItems.AddRange(
            new ProjectItem { PlantId = "plant-a", ProjectId = "pa", Tag = "ROM-P-001", PopulationId = popA.Id },
            new ProjectItem { PlantId = "plant-b", ProjectId = "pb", Tag = "ROM-P-001", PopulationId = popB.Id, MotherPlantId = null });
        db.LineOrigins.Add(new LineOrigin { LineId = lb.Id, Role = "mother", SourceLineName = "Secret", SourceLabel = "F1" });
        await db.SaveChangesAsync();
        return (db, la.Id, lb.Id, popA.Id, popB.Id);
    }

    [Fact]
    public async Task Resolves_own_ids()
    {
        var (db, la, _, pa, _) = await SeedAsync();
        using var _ = db;
        var scope = new ProjectScope(db, "pa");
        Assert.NotNull(await scope.FindPlantAsync("plant-a"));
        Assert.NotNull(await scope.FindLineAsync(la));
        Assert.NotNull(await scope.FindPopulationAsync(pa));
    }

    [Fact]
    public async Task Foreign_and_unknown_plant_ids_are_both_null()
    {
        var (db, _, _, _, _) = await SeedAsync();
        using var _ = db;
        var scope = new ProjectScope(db, "pa");
        Assert.Null(await scope.FindPlantAsync("plant-b"));
        Assert.Null(await scope.FindPlantAsync("nope"));
        Assert.Null(await scope.FindPlantAsync(null));
        Assert.Null(await scope.FindPlantAsync(" "));
    }

    [Fact]
    public async Task Foreign_and_unknown_lines_populations_fields_are_null()
    {
        var (db, _, lb, _, pb) = await SeedAsync();
        using var _ = db;
        var scope = new ProjectScope(db, "pa");
        var foreignField = db.Fields.Single().Id;
        Assert.Null(await scope.FindLineAsync(lb));
        Assert.Null(await scope.FindLineAsync(99999));
        Assert.Null(await scope.FindLineAsync(null));
        Assert.Null(await scope.FindPopulationAsync(pb));
        Assert.Null(await scope.FindPopulationAsync(99999));
        Assert.Null(await scope.FindFieldAsync(foreignField));
        Assert.Null(await scope.FindFieldAsync(99999));
    }

    [Fact]
    public async Task Foreign_and_unknown_ids_throw_identical_errors()
    {
        var (db, _, lb, _, pb) = await SeedAsync();
        using var _ = db;
        var scope = new ProjectScope(db, "pa");
        var foreignField = db.Fields.Single().Id;

        static async Task<PedigreeException> Catch(Func<Task> act) => await Assert.ThrowsAsync<PedigreeException>(act);

        var l1 = await Catch(() => scope.RequireLineAsync(lb));
        var l2 = await Catch(() => scope.RequireLineAsync(99999));
        Assert.Equal((l1.StatusCode, l1.Code, l1.Field, l1.Message), (l2.StatusCode, l2.Code, l2.Field, l2.Message));
        Assert.Equal("line_not_found", l1.Code);

        var p1 = await Catch(() => scope.RequirePopulationAsync(pb));
        var p2 = await Catch(() => scope.RequirePopulationAsync(99999));
        Assert.Equal((p1.Code, p1.Field, p1.Message), (p2.Code, p2.Field, p2.Message));
        Assert.Equal("populationId", p1.Field);

        var f1 = await Catch(() => scope.RequireFieldAsync(foreignField));
        var f2 = await Catch(() => scope.RequireFieldAsync(99999));
        Assert.Equal((f1.Code, f1.Field, f1.Message), (f2.Code, f2.Field, f2.Message));
        Assert.Equal("field_not_found", f1.Code);
        Assert.DoesNotContain("Secret", f1.Message);
    }

    [Fact]
    public async Task Parent_not_found_message_echoes_only_the_sent_id_never_the_foreign_tag()
    {
        var (db, _, _, _, _) = await SeedAsync();
        using var _ = db;
        var scope = new ProjectScope(db, "pa");
        var foreign = await Assert.ThrowsAsync<PedigreeException>(() => scope.RequireParentAsync("mother", "plant-b"));
        var unknown = await Assert.ThrowsAsync<PedigreeException>(() => scope.RequireParentAsync("mother", "plant-x"));
        Assert.Equal("There is no plant plant-b in this project.", foreign.Message);
        Assert.Equal("parent_not_found", foreign.Code);
        Assert.Equal(foreign.Code, unknown.Code);
        Assert.Equal(foreign.Field, unknown.Field);
        Assert.DoesNotContain("ROM-P-001", foreign.Message);
    }

    [Fact]
    public async Task Long_sent_id_is_cut_in_the_message()
    {
        var (db, _, _, _, _) = await SeedAsync();
        using var _ = db;
        var scope = new ProjectScope(db, "pa");
        var ex = await Assert.ThrowsAsync<PedigreeException>(() => scope.RequireParentAsync("father", new string('x', 500)));
        Assert.True(ex.Message.Length < 120);
    }

    [Fact]
    public async Task Origins_are_reached_only_through_a_line_of_this_project()
    {
        var (db, la, lb, _, _) = await SeedAsync();
        using var _ = db;
        var scope = new ProjectScope(db, "pa");
        Assert.Empty(await scope.GetOriginsAsync(lb));
        Assert.Empty(await scope.GetOriginsAsync(la));
        Assert.Single(await new ProjectScope(db, "pb").GetOriginsAsync(lb));
    }

    [Fact]
    public async Task Parent_edges_never_include_other_projects()
    {
        var (db, _, _, _, _) = await SeedAsync();
        using var _ = db;
        var edges = await new ProjectScope(db, "pa").LoadParentEdgesAsync();
        Assert.Equal(new[] { "plant-a" }, edges.Keys.ToArray());
    }
}
