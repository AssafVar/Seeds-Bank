using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class VegetableVarietiesControllerTests
{
    private static VegetableVarietyRequest MakeRequest() => new()
    {
        Name = "Cherry Tomato",
        PlantSpacing = 0.3,
        RowSpacing = 0.5,
        WaterMmPerSeason = 400,
        FertilizerKgPer100m2 = 3,
        SeedBufferPercent = 0.15,
    };

    [Fact]
    public async Task GetAll_returns_ok_with_the_varieties()
    {
        var service = new Mock<IVegetableVarietyService>();
        service.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<VegetableVarietyDto> { new() { Id = 1, Name = "Cherry Tomato" } });
        var controller = new VegetableVarietiesController(service.Object);

        var result = await controller.GetAll();

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Create_returns_ok_with_the_created_variety()
    {
        var service = new Mock<IVegetableVarietyService>();
        service.Setup(s => s.CreateAsync(It.IsAny<VegetableVarietyRequest>())).ReturnsAsync(new VegetableVarietyDto { Id = 1, Name = "Cherry Tomato" });
        var controller = new VegetableVarietiesController(service.Object);

        var result = await controller.Create(MakeRequest());

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Update_returns_ok_when_the_variety_exists()
    {
        var service = new Mock<IVegetableVarietyService>();
        service.Setup(s => s.UpdateAsync(1, It.IsAny<VegetableVarietyRequest>())).ReturnsAsync(true);
        var controller = new VegetableVarietiesController(service.Object);

        var result = await controller.Update(1, MakeRequest());

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Update_returns_not_found_when_the_variety_is_missing()
    {
        var service = new Mock<IVegetableVarietyService>();
        service.Setup(s => s.UpdateAsync(999, It.IsAny<VegetableVarietyRequest>())).ReturnsAsync(false);
        var controller = new VegetableVarietiesController(service.Object);

        var result = await controller.Update(999, MakeRequest());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_returns_ok_when_the_variety_exists()
    {
        var service = new Mock<IVegetableVarietyService>();
        service.Setup(s => s.DeleteAsync(1)).ReturnsAsync(true);
        var controller = new VegetableVarietiesController(service.Object);

        var result = await controller.Delete(1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Delete_returns_not_found_when_the_variety_is_missing()
    {
        var service = new Mock<IVegetableVarietyService>();
        service.Setup(s => s.DeleteAsync(999)).ReturnsAsync(false);
        var controller = new VegetableVarietiesController(service.Object);

        var result = await controller.Delete(999);

        Assert.IsType<NotFoundResult>(result);
    }
}
