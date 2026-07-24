using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class FieldsControllerTests
{
    private static FieldsController MakeController(Mock<IFieldService> fieldService, Mock<IFieldWorkLogService> workLogService, string callerUserId = "u1")
    {
        var controller = new FieldsController(fieldService.Object, workLogService.Object);
        ControllerTestHelpers.SetUser(controller, callerUserId);
        return controller;
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
        fieldService.Setup(s => s.GetByProjectAsync("p1")).ReturnsAsync(new List<FieldDto>());
        var controller = MakeController(fieldService, new Mock<IFieldWorkLogService>());

        var result = await controller.GetFields("u1", "p1");

        Assert.IsType<OkObjectResult>(result);
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
