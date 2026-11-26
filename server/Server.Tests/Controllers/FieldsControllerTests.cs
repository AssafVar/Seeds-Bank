using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class FieldsControllerTests
{
    // Unless a test passes its own projectsService, the caller owns every
    // project, so tests that aren't about project ownership stay focused on
    // the endpoint's own behavior.
    private static FieldsController MakeController(Mock<IFieldService> fieldService, Mock<IFieldWorkLogService> workLogService, string callerUserId = "u1", Mock<IProjectsService>? projectsService = null)
    {
        if (projectsService is null)
        {
            projectsService = new Mock<IProjectsService>();
            projectsService.Setup(s => s.IsProjectOwnedAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(true);
        }

        var controller = new FieldsController(fieldService.Object, workLogService.Object, projectsService.Object);
        ControllerTestHelpers.SetUser(controller, callerUserId);
        return controller;
    }

    // u1 is signed in and the route says u1, but project p-other belongs to
    // someone else.
    private static Mock<IProjectsService> ProjectNotOwnedByU1()
    {
        var projectsService = new Mock<IProjectsService>();
        projectsService.Setup(s => s.IsProjectOwnedAsync("u1", "p-other")).ReturnsAsync(false);
        return projectsService;
    }

    public static TheoryData<string> EveryEndpoint => new()
    {
        "GetFields", "CreateField", "RenameField", "UpdateFieldGeometry", "UpdateFieldProperties",
        "DeleteField", "GetWorkLogs", "CreateWorkLog", "DeleteWorkLog",
    };

    private static Task<IActionResult> Call(FieldsController c, string endpoint, string projectId) => endpoint switch
    {
        "GetFields" => c.GetFields("u1", projectId),
        "CreateField" => c.CreateField("u1", projectId, new FieldRequest()),
        "RenameField" => c.RenameField("u1", projectId, 1, new RenameFieldRequest { Name = "x" }),
        "UpdateFieldGeometry" => c.UpdateFieldGeometry("u1", projectId, 1, new UpdateFieldGeometryRequest()),
        "UpdateFieldProperties" => c.UpdateFieldProperties("u1", projectId, 1, new UpdateFieldPropertiesRequest()),
        "DeleteField" => c.DeleteField("u1", projectId, 1),
        "GetWorkLogs" => c.GetWorkLogs("u1", projectId, 1),
        "CreateWorkLog" => c.CreateWorkLog("u1", projectId, 1, new FieldWorkLogRequest()),
        "DeleteWorkLog" => c.DeleteWorkLog("u1", projectId, 1, 1),
        _ => throw new ArgumentOutOfRangeException(nameof(endpoint)),
    };

    [Theory]
    [MemberData(nameof(EveryEndpoint))]
    public async Task Every_endpoint_returns_not_found_for_another_user_s_project_and_touches_no_data(string endpoint)
    {
        var fieldService = new Mock<IFieldService>(MockBehavior.Strict);
        var workLogService = new Mock<IFieldWorkLogService>(MockBehavior.Strict);
        var controller = MakeController(fieldService, workLogService, projectsService: ProjectNotOwnedByU1());

        var result = await Call(controller, endpoint, "p-other");

        Assert.IsType<NotFoundResult>(result);
        fieldService.VerifyNoOtherCalls();
        workLogService.VerifyNoOtherCalls();
    }

    [Theory]
    [MemberData(nameof(EveryEndpoint))]
    public async Task Every_endpoint_returns_forbidden_before_checking_the_project_when_the_route_userId_is_not_the_caller(string endpoint)
    {
        var projectsService = new Mock<IProjectsService>(MockBehavior.Strict);
        var controller = MakeController(new Mock<IFieldService>(MockBehavior.Strict), new Mock<IFieldWorkLogService>(MockBehavior.Strict), callerUserId: "someone-else", projectsService: projectsService);

        var result = await Call(controller, endpoint, "p1");

        Assert.IsType<ForbidResult>(result);
        projectsService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetFields_returns_forbidden_when_the_caller_is_not_the_route_s_userId()
    {
        var fieldService = new Mock<IFieldService>();
        var workLogService = new Mock<IFieldWorkLogService>();
        var controller = MakeController(fieldService, workLogService, callerUserId: "someone-else");

        var result = await controller.GetFields("u1", "p1");

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetFields_returns_ok_with_the_project_s_fields()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.GetByProjectAsync("p1", 1, 12)).ReturnsAsync(new PagedResultDto<FieldDto>());
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.GetFields("u1", "p1");

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetFields_forwards_page_and_pageSize_to_the_service()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.GetByProjectAsync("p1", 3, 5)).ReturnsAsync(new PagedResultDto<FieldDto>());
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.GetFields("u1", "p1", page: 3, pageSize: 5);

        Assert.IsType<OkObjectResult>(result);
        fieldService.Verify(s => s.GetByProjectAsync("p1", 3, 5), Times.Once);
    }

    [Fact]
    public async Task CreateField_returns_ok_with_the_created_field()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.CreateAsync("p1", It.IsAny<FieldRequest>())).ReturnsAsync(new FieldDto());
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.CreateField("u1", "p1", new FieldRequest { Name = "North plot", ShapeType = "rectangle" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task CreateField_returns_bad_request_when_the_service_rejects_the_request()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.CreateAsync("p1", It.IsAny<FieldRequest>())).ThrowsAsync(new ArgumentException("Plant spacing and row spacing must be positive."));
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.CreateField("u1", "p1", new FieldRequest { Name = "North plot", ShapeType = "rectangle" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task RenameField_returns_ok_with_the_renamed_field()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.RenameAsync("p1", 1, "North block")).ReturnsAsync(new FieldDto { Name = "North block" });
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.RenameField("u1", "p1", 1, new RenameFieldRequest { Name = "North block" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task RenameField_returns_not_found_for_a_missing_field()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.RenameAsync("p1", 999, It.IsAny<string>())).ReturnsAsync((FieldDto?)null);
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.RenameField("u1", "p1", 999, new RenameFieldRequest { Name = "x" });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task RenameField_returns_bad_request_when_the_service_rejects_the_name()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.RenameAsync("p1", 1, "")).ThrowsAsync(new ArgumentException("Name cannot be empty."));
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.RenameField("u1", "p1", 1, new RenameFieldRequest { Name = "" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateFieldGeometry_returns_not_found_for_a_missing_field()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.UpdateGeometryAsync("p1", 999, It.IsAny<UpdateFieldGeometryRequest>())).ReturnsAsync((FieldDto?)null);
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.UpdateFieldGeometry("u1", "p1", 999, new UpdateFieldGeometryRequest());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateFieldGeometry_returns_bad_request_when_the_service_rejects_the_geometry()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.UpdateGeometryAsync("p1", 1, It.IsAny<UpdateFieldGeometryRequest>()))
            .ThrowsAsync(new ArgumentException("Sub-field must stay within the large field's boundary."));
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.UpdateFieldGeometry("u1", "p1", 1, new UpdateFieldGeometryRequest());

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateFieldProperties_returns_ok_when_updated()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.UpdatePropertiesAsync("p1", 1, It.IsAny<UpdateFieldPropertiesRequest>())).ReturnsAsync(new FieldDto());
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.UpdateFieldProperties("u1", "p1", 1, new UpdateFieldPropertiesRequest { Name = "Renamed" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task DeleteField_returns_ok_when_deleted()
    {
        var fieldService = new Mock<IFieldService>();
        fieldService.Setup(s => s.DeleteAsync("p1", 1)).ReturnsAsync(true);
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.DeleteField("u1", "p1", 1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task GetWorkLogs_returns_ok_with_the_field_s_logs()
    {
        var workLogService = new Mock<IFieldWorkLogService>();
        workLogService.Setup(s => s.GetByFieldAsync("p1", 1)).ReturnsAsync(new List<FieldWorkLogDto>());
        var controller = MakeController(new Mock<IFieldService>(), workLogService);

        var result = await controller.GetWorkLogs("u1", "p1", 1);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task CreateWorkLog_returns_not_found_when_the_field_does_not_exist()
    {
        var workLogService = new Mock<IFieldWorkLogService>();
        workLogService.Setup(s => s.CreateAsync("p1", 999, It.IsAny<FieldWorkLogRequest>())).ReturnsAsync((FieldWorkLogDto?)null);
        var controller = MakeController(new Mock<IFieldService>(), workLogService);

        var result = await controller.CreateWorkLog("u1", "p1", 999, new FieldWorkLogRequest { WorkerId = 1, HoursWorked = 4 });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task CreateWorkLog_returns_bad_request_for_an_unknown_worker()
    {
        var workLogService = new Mock<IFieldWorkLogService>();
        workLogService.Setup(s => s.CreateAsync("p1", 1, It.IsAny<FieldWorkLogRequest>())).ThrowsAsync(new ArgumentException("Worker not found."));
        var controller = MakeController(new Mock<IFieldService>(), workLogService);

        var result = await controller.CreateWorkLog("u1", "p1", 1, new FieldWorkLogRequest { WorkerId = 999, HoursWorked = 4 });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteWorkLog_returns_ok_when_deleted()
    {
        var workLogService = new Mock<IFieldWorkLogService>();
        workLogService.Setup(s => s.DeleteAsync("p1", 1, 5)).ReturnsAsync(true);
        var controller = MakeController(new Mock<IFieldService>(), workLogService);

        var result = await controller.DeleteWorkLog("u1", "p1", 1, 5);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task DeleteWorkLog_returns_not_found_when_missing()
    {
        var workLogService = new Mock<IFieldWorkLogService>();
        workLogService.Setup(s => s.DeleteAsync("p1", 1, 999)).ReturnsAsync(false);
        var controller = MakeController(new Mock<IFieldService>(), workLogService);

        var result = await controller.DeleteWorkLog("u1", "p1", 1, 999);

        Assert.IsType<NotFoundResult>(result);
    }
}
