using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class ProjectsServiceTests
{
    private static ProjectItemDto MakeItem(string plantId, string projectId = "p1", int generation = 0) => new()
    {
        Line = "Line A",
        ProjectName = "Tomatoes",
        ProjectId = projectId,
        PlantId = plantId,
        PlantFatherId = "---",
        PlantMotherId = "---",
        FruitColor = "red",
        FruitWeight = "10g",
        SeedColor = "black",
        SeedWeight = "1g",
        Generation = generation,
    };

    [Fact]
    public async Task CreateProjectAsync_then_GetUserProjectsAsync_returns_it()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);

        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var projects = await service.GetUserProjectsAsync("u1");
        Assert.Single(projects);
        Assert.Equal("Tomatoes", projects[0].ProjectName);
    }

    [Fact]
    public async Task GetUserProjectsAsync_does_not_return_another_user_s_projects()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var projects = await service.GetUserProjectsAsync("someone-else");

        Assert.Empty(projects);
    }

    [Fact]
    public async Task GetProjectAsync_returns_null_when_not_owned_by_the_given_user()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var result = await service.GetProjectAsync("someone-else", "p1");

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateProjectDetailsAsync_inserts_new_plant_rows()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var success = await service.UpdateProjectDetailsAsync("u1", "p1", new List<ProjectItemDto> { MakeItem("plant-1") });

        Assert.True(success);
        var project = await service.GetProjectAsync("u1", "p1");
        Assert.Single(project!.ProjectDetails);
        Assert.Equal("Line A", project.ProjectDetails[0].Line);
    }

    [Fact]
    public async Task UpdateProjectDetailsAsync_overwrites_an_existing_plant_row()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });
        await service.UpdateProjectDetailsAsync("u1", "p1", new List<ProjectItemDto> { MakeItem("plant-1") });

        var updated = MakeItem("plant-1");
        updated.Line = "Line A (renamed)";
        await service.UpdateProjectDetailsAsync("u1", "p1", new List<ProjectItemDto> { updated });

        var project = await service.GetProjectAsync("u1", "p1");
        Assert.Single(project!.ProjectDetails);
        Assert.Equal("Line A (renamed)", project.ProjectDetails[0].Line);
    }

    [Fact]
    public async Task UpdateProjectDetailsAsync_ignores_rows_claiming_a_different_project_id()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        await service.UpdateProjectDetailsAsync("u1", "p1", new List<ProjectItemDto> { MakeItem("plant-1", projectId: "someone-elses-project") });

        var project = await service.GetProjectAsync("u1", "p1");
        Assert.Empty(project!.ProjectDetails);
    }

    [Fact]
    public async Task UpdateProjectDetailsAsync_returns_false_for_an_unowned_project()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var success = await service.UpdateProjectDetailsAsync("someone-else", "p1", new List<ProjectItemDto> { MakeItem("plant-1") });

        Assert.False(success);
    }

    [Fact]
    public async Task DeletePlantAsync_removes_the_plant_and_returns_true()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });
        await service.UpdateProjectDetailsAsync("u1", "p1", new List<ProjectItemDto> { MakeItem("plant-1") });

        var success = await service.DeletePlantAsync("u1", "p1", "plant-1");

        Assert.True(success);
        var project = await service.GetProjectAsync("u1", "p1");
        Assert.Empty(project!.ProjectDetails);
    }

    [Fact]
    public async Task DeletePlantAsync_returns_false_for_an_unowned_project()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });
        await service.UpdateProjectDetailsAsync("u1", "p1", new List<ProjectItemDto> { MakeItem("plant-1") });

        var success = await service.DeletePlantAsync("someone-else", "p1", "plant-1");

        Assert.False(success);
    }

    [Fact]
    public async Task DeletePlantAsync_returns_false_for_a_missing_plant()
    {
        using var db = TestDbContextFactory.Create();
        var service = new ProjectsService(db);
        await service.CreateProjectAsync("u1", new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" });

        var success = await service.DeletePlantAsync("u1", "p1", "missing-plant");

        Assert.False(success);
    }
}
