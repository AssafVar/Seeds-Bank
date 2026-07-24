using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class WorkersControllerTests
{
    private static WorkerRequest MakeRequest() => new() { Name = "Alice", Role = "Picker", HourlyRate = 15 };

    [Fact]
    public async Task GetAll_returns_ok_with_the_workers()
    {
        var service = new Mock<IWorkerService>();
        service.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<WorkerDto> { new() { Id = 1, Name = "Alice" } });
        var controller = new WorkersController(service.Object);

        var result = await controller.GetAll();

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Create_returns_ok_with_the_created_worker()
    {
        var service = new Mock<IWorkerService>();
        service.Setup(s => s.CreateAsync(It.IsAny<WorkerRequest>())).ReturnsAsync(new WorkerDto { Id = 1, Name = "Alice" });
        var controller = new WorkersController(service.Object);

        var result = await controller.Create(MakeRequest());

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Update_returns_not_found_when_the_worker_is_missing()
    {
        var service = new Mock<IWorkerService>();
        service.Setup(s => s.UpdateAsync(999, It.IsAny<WorkerRequest>())).ReturnsAsync(false);
        var controller = new WorkersController(service.Object);

        var result = await controller.Update(999, MakeRequest());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_returns_ok_when_the_worker_exists()
    {
        var service = new Mock<IWorkerService>();
        service.Setup(s => s.DeleteAsync(1)).ReturnsAsync(true);
        var controller = new WorkersController(service.Object);

        var result = await controller.Delete(1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Delete_returns_bad_request_when_the_worker_has_logged_hours()
    {
        var service = new Mock<IWorkerService>();
        service.Setup(s => s.DeleteAsync(1)).ThrowsAsync(new ArgumentException("This worker has logged hours on a field and can't be deleted."));
        var controller = new WorkersController(service.Object);

        var result = await controller.Delete(1);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
    }
}
