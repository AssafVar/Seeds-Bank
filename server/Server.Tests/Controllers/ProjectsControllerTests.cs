using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class ProjectsControllerTests
{
    private static ProjectsController MakeController(Mock<IProjectsService> service, string callerUserId = "u1", bool ownsProject = true)
    {
        service.Setup(s => s.IsProjectOwnedAsync("u1", It.IsAny<string>())).ReturnsAsync(ownsProject);
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
    public async Task GetProject_returns_ok_with_lines_and_projectHeaders()
    {
        var service = new Mock<IProjectsService>();
        var overview = new ProjectOverviewResponse
        {
            ProjectHeaders = new ProjectHeaderDto { ProjectId = "p1", ProjectName = "Tomatoes" },
            Lines = new List<LineDto> { new() { Id = 1, Name = "Founders", Code = "P", IsFounders = true } },
        };
        service.Setup(s => s.GetProjectAsync("u1", "p1")).ReturnsAsync(overview);
        var controller = MakeController(service);

        var result = await controller.GetProject("u1", "p1");

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<ProjectOverviewResponse>(ok.Value);
        Assert.Equal("Tomatoes", body.ProjectHeaders!.ProjectName);
        Assert.Single(body.Lines);
    }

    [Fact]
    public async Task GetProject_returns_not_found_when_missing()
    {
        var service = new Mock<IProjectsService>();
        service.Setup(s => s.GetProjectAsync("u1", "p1")).ReturnsAsync((ProjectOverviewResponse?)null);
        var controller = MakeController(service);

        var result = await controller.GetProject("u1", "p1");

        Assert.IsType<NotFoundResult>(result);
    }

    // The old "UpdateProject returns ok / not found" tests (test plan 5.4
    // says keep) cannot stay: the whole-list save is a 410 now. They become
    // the two legacy-route tests below.
    [Fact]
    public async Task LegacySave_returns_410_with_a_message_for_the_owner()
    {
        var service = new Mock<IProjectsService>();
        var controller = MakeController(service);

        var result = await controller.LegacySave("u1", "p1");

        var gone = Assert.IsType<ObjectResult>(result);
        Assert.Equal(410, gone.StatusCode);
        Assert.Equal("This page is out of date. Reload and try again.", gone.Value!.GetType().GetProperty("message")!.GetValue(gone.Value));
    }

    [Fact]
    public async Task LegacySave_returns_not_found_when_the_project_does_not_exist()
    {
        var service = new Mock<IProjectsService>();
        var controller = MakeController(service, ownsProject: false);

        var result = await controller.LegacySave("u1", "p1");

        Assert.IsType<NotFoundResult>(result);
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
}
