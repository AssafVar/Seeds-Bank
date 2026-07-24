using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class ProjectsControllerTests
{
    private static ProjectsController MakeController(Mock<IProjectsService> service, string callerUserId = "u1")
    {
        var controller = new ProjectsController(service.Object);
        ControllerTestHelpers.SetUser(controller, callerUserId);
        return controller;
    }

    [Fact]
    public async Task GetProject_returns_forbidden_when_the_caller_is_not_the_route_s_userId()
    {
        var service = new Mock<IProjectsService>();
        var controller = MakeController(service, callerUserId: "someone-else");

        var result = await controller.GetProject("u1", "p1");

        Assert.IsType<ForbidResult>(result);
        service.Verify(s => s.GetProjectAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetProject_returns_ok_when_found()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.GetProjectAsync("u1", "p1")).ReturnsAsync(new ProjectDetailResponse());
        var controller = MakeController(service);

        var result = await controller.GetProject("u1", "p1");

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetProject_returns_not_found_when_missing()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.GetProjectAsync("u1", "p1")).ReturnsAsync((ProjectDetailResponse?)null);
        var controller = MakeController(service);

        var result = await controller.GetProject("u1", "p1");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateProject_returns_ok_when_the_project_is_updated()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.UpdateProjectDetailsAsync("u1", "p1", It.IsAny<List<ProjectItemDto>>())).ReturnsAsync(true);
        var controller = MakeController(service);

        var result = await controller.UpdateProject("u1", "p1", new List<ProjectItemDto>());

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task UpdateProject_returns_not_found_when_the_project_does_not_exist()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.UpdateProjectDetailsAsync("u1", "p1", It.IsAny<List<ProjectItemDto>>())).ReturnsAsync(false);
        var controller = MakeController(service);

        var result = await controller.UpdateProject("u1", "p1", new List<ProjectItemDto>());

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.NotNull(notFound.Value);
    }

    [Fact]
    public async Task GetUserProjectList_returns_ok_with_the_caller_s_projects()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.GetUserProjectsAsync("u1")).ReturnsAsync(new List<ProjectHeaderDto>());
        var controller = MakeController(service);

        var result = await controller.GetUserProjectList("u1");

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task CreateNewProject_returns_ok_and_calls_the_service()
    {
        var service = new Mock<IProjectsService>();
        var controller = MakeController(service);
        var request = new CreateProjectRequest { ProjectId = "p1", ProjectName = "Tomatoes", PlantType = "Vegetable" };

        var result = await controller.CreateNewProject("u1", request);

        Assert.IsType<OkResult>(result);
        service.Verify(s => s.CreateProjectAsync("u1", request), Times.Once);
    }

    [Fact]
    public async Task DeletePlant_returns_ok_when_deleted()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.DeletePlantAsync("u1", "p1", "plant-1")).ReturnsAsync(true);
        var controller = MakeController(service);

        var result = await controller.DeletePlant("u1", "p1", "plant-1");

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task DeletePlant_returns_not_found_when_the_plant_is_missing()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.DeletePlantAsync("u1", "p1", "missing")).ReturnsAsync(false);
        var controller = MakeController(service);

        var result = await controller.DeletePlant("u1", "p1", "missing");

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.NotNull(notFound.Value);
    }
}
