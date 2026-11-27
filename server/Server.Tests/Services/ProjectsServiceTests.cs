using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class ProjectsServiceTests
{
    private static ProjectsService MakeService(SeedsBank.Server.Data.AppDbContext db) => new TestServices(db).Projects;

    [Fact]
    public async Task CreateProjectAsync_then_GetUserProjectsAsync_returns_it()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);

        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var projects = await service.GetUserProjectsAsync("u1");
        Assert.Single(projects);
        Assert.Equal("Tomatoes", projects[0].ProjectName);
    }

    [Fact]
    public async Task CreateProject_creates_Founders_line()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);

        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });
        await service.CreateProjectAsync("u2", new CreateProjectRequest { ProjectId = "p2", ProjectName = "Peppers", PlantType = "Vegetable" });

        var overview = await service.GetProjectAsync("u1", "p1");
        var founders = Assert.Single(overview!.Lines);
        Assert.True(founders.IsFounders);
        Assert.Equal("Founders", founders.Name);
        Assert.Equal("P", founders.Code);
        Assert.Equal(0, founders.PlantCount);
        Assert.Equal("founders", founders.Origin.Kind);
        Assert.Equal(2, db.Lines.Count(l => l.IsFounders));
    }

    [Fact]
    public async Task GetUserProjectsAsync_does_not_return_another_user_s_projects()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var projects = await service.GetUserProjectsAsync("someone-else");

        Assert.Empty(projects);
    }

    [Fact]
    public async Task GetProjectAsync_returns_null_when_not_owned_by_the_given_user()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var result = await service.GetProjectAsync("someone-else", "p1");

        Assert.Null(result);
    }

    [Fact]
    public async Task IsProjectOwnedAsync_is_true_only_for_the_owner_s_existing_project()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });
        await service.CreateProjectAsync("u2", new CreateProjectRequest { ProjectId = "p2", ProjectName = "Peppers", PlantType = "Vegetable" });

        Assert.True(await service.IsProjectOwnedAsync("u1", "p1"));
        Assert.False(await service.IsProjectOwnedAsync("u1", "p2"));
        Assert.False(await service.IsProjectOwnedAsync("u1", "missing"));
    }
}
