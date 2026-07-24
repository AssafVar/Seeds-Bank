using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class SiteContentControllerTests
{
    [Fact]
    public async Task GetSiteContent_returns_ok_with_the_content()
    {
        var service = new Mock<ISiteContentService>();
        service.Setup(s => s.GetSiteContentAsync()).ReturnsAsync(new SiteContentDto { Description = "About us" });
        var controller = new SiteContentController(service.Object);

        var result = await controller.GetSiteContent();

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task UpdateSiteContent_returns_ok()
    {
        var service = new Mock<ISiteContentService>();
        var controller = new SiteContentController(service.Object);

        var result = await controller.UpdateSiteContent(new UpdateSiteContentRequest { Description = "New copy" });

        Assert.IsType<OkResult>(result);
        service.Verify(s => s.UpdateSiteContentAsync(It.Is<UpdateSiteContentRequest>(r => r.Description == "New copy")), Times.Once);
    }

    [Fact]
    public async Task AddGalleryImage_returns_ok_with_the_uploaded_image()
    {
        var service = new Mock<ISiteContentService>();
        var file = new Mock<IFormFile>();
        service.Setup(s => s.AddGalleryImageAsync(file.Object, "Garden")).ReturnsAsync(new GalleryImageDto { Id = 1, Url = "/uploads/gallery/a.jpg" });
        var controller = new SiteContentController(service.Object);

        var result = await controller.AddGalleryImage(new UploadGalleryImageRequest { File = file.Object, Caption = "Garden" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task AddGalleryImage_returns_bad_request_for_an_unsupported_file_type()
    {
        var service = new Mock<ISiteContentService>();
        var file = new Mock<IFormFile>();
        service.Setup(s => s.AddGalleryImageAsync(file.Object, null)).ThrowsAsync(new ArgumentException("Unsupported file type."));
        var controller = new SiteContentController(service.Object);

        var result = await controller.AddGalleryImage(new UploadGalleryImageRequest { File = file.Object });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteGalleryImage_returns_ok_when_the_image_exists()
    {
        var service = new Mock<ISiteContentService>();
        service.Setup(s => s.DeleteGalleryImageAsync(1)).ReturnsAsync(true);
        var controller = new SiteContentController(service.Object);

        var result = await controller.DeleteGalleryImage(1);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task DeleteGalleryImage_returns_not_found_when_the_image_is_missing()
    {
        var service = new Mock<ISiteContentService>();
        service.Setup(s => s.DeleteGalleryImageAsync(999)).ReturnsAsync(false);
        var controller = new SiteContentController(service.Object);

        var result = await controller.DeleteGalleryImage(999);

        Assert.IsType<NotFoundResult>(result);
    }
}
