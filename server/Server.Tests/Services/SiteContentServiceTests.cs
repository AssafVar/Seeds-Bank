using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Moq;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class SiteContentServiceTests : IDisposable
{
    private readonly string _webRoot;

    public SiteContentServiceTests()
    {
        _webRoot = Path.Combine(Path.GetTempPath(), "seedsbank-tests-" + Guid.NewGuid());
        Directory.CreateDirectory(_webRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(_webRoot))
        {
            Directory.Delete(_webRoot, recursive: true);
        }
    }

    private SiteContentService MakeService(Data.AppDbContext db)
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.WebRootPath).Returns(_webRoot);
        return new SiteContentService(db, env.Object);
    }

    private static IFormFile MakeFormFile(string fileName, byte[] bytes)
    {
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "file", fileName);
    }

    [Fact]
    public async Task GetSiteContentAsync_creates_a_default_row_on_first_access()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);

        var content = await service.GetSiteContentAsync();

        Assert.Null(content.Description);
        Assert.Empty(content.Images);
        Assert.Single(db.SiteContents);
    }

    [Fact]
    public async Task UpdateSiteContentAsync_persists_the_new_fields()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);

        await service.UpdateSiteContentAsync(new UpdateSiteContentRequest { Description = "About us", ContactEmail = "hello@seedsbank.test" });
        var content = await service.GetSiteContentAsync();

        Assert.Equal("About us", content.Description);
        Assert.Equal("hello@seedsbank.test", content.ContactEmail);
    }

    [Fact]
    public async Task AddGalleryImageAsync_saves_the_file_to_disk_and_records_it()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        var file = MakeFormFile("photo.jpg", new byte[] { 1, 2, 3 });

        var image = await service.AddGalleryImageAsync(file, "Garden");

        Assert.Equal("Garden", image.Caption);
        Assert.StartsWith("/uploads/gallery/", image.Url);
        var savedPath = Path.Combine(_webRoot, image.Url.TrimStart('/'));
        Assert.True(File.Exists(savedPath));
    }

    [Fact]
    public async Task AddGalleryImageAsync_rejects_an_unsupported_file_type()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        var file = MakeFormFile("document.pdf", new byte[] { 1, 2, 3 });

        await Assert.ThrowsAsync<ArgumentException>(() => service.AddGalleryImageAsync(file, null));
    }

    [Fact]
    public async Task AddGalleryImageAsync_rejects_an_empty_file()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        var file = MakeFormFile("photo.jpg", Array.Empty<byte>());

        await Assert.ThrowsAsync<ArgumentException>(() => service.AddGalleryImageAsync(file, null));
    }

    [Fact]
    public async Task DeleteGalleryImageAsync_removes_the_record_and_the_file_on_disk()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        var image = await service.AddGalleryImageAsync(MakeFormFile("photo.jpg", new byte[] { 1, 2, 3 }), null);
        var savedPath = Path.Combine(_webRoot, image.Url.TrimStart('/'));

        var success = await service.DeleteGalleryImageAsync(image.Id);

        Assert.True(success);
        Assert.False(File.Exists(savedPath));
    }

    [Fact]
    public async Task DeleteGalleryImageAsync_returns_false_for_a_missing_image()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);

        Assert.False(await service.DeleteGalleryImageAsync(999));
    }
}
