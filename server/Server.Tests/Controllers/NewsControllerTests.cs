using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class NewsControllerTests
{
    [Fact]
    public async Task GetAll_returns_ok_with_the_posts()
    {
        var service = new Mock<INewsService>();
        service.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<NewsPostDto> { new() { Id = 1, Title = "Hello" } });
        var controller = new NewsController(service.Object);

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Single((List<NewsPostDto>)ok.Value!);
    }

    [Fact]
    public async Task Create_returns_ok_with_the_created_post()
    {
        var service = new Mock<INewsService>();
        service.Setup(s => s.CreateAsync(It.IsAny<NewsPostRequest>())).ReturnsAsync(new NewsPostDto { Id = 1, Title = "Hello" });
        var controller = new NewsController(service.Object);

        var result = await controller.Create(new NewsPostRequest { Title = "Hello", Body = "World" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Update_returns_ok_when_the_post_exists()
    {
        var service = new Mock<INewsService>();
        service.Setup(s => s.UpdateAsync(1, It.IsAny<NewsPostRequest>())).ReturnsAsync(true);
        var controller = new NewsController(service.Object);

        var result = await controller.Update(1, new NewsPostRequest { Title = "Hello", Body = "World" });

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Update_returns_not_found_when_the_post_is_missing()
    {
        var service = new Mock<INewsService>();
        service.Setup(s => s.UpdateAsync(999, It.IsAny<NewsPostRequest>())).ReturnsAsync(false);
        var controller = new NewsController(service.Object);

        var result = await controller.Update(999, new NewsPostRequest { Title = "Hello", Body = "World" });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_returns_ok_when_the_post_exists()
    {
        var service = new Mock<INewsService>();
        service.Setup(s => s.DeleteAsync(1)).ReturnsAsync(true);
        var controller = new NewsController(service.Object);

        var result = await controller.Delete(1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Delete_returns_not_found_when_the_post_is_missing()
    {
        var service = new Mock<INewsService>();
        service.Setup(s => s.DeleteAsync(999)).ReturnsAsync(false);
        var controller = new NewsController(service.Object);

        var result = await controller.Delete(999);

        Assert.IsType<NotFoundResult>(result);
    }
}
