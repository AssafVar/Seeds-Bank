using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;
using SeedsBank.Server.Storage;

namespace SeedsBank.Server.Tests.Services;

public class SiteContentServiceTests
{
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, (byte)'J', (byte)'F', (byte)'I', (byte)'F'];
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D];
    private static readonly byte[] Gif = "GIF89a\u0001\u0000"u8.ToArray();
    private static readonly byte[] Webp = [.. "RIFF"u8, 0x24, 0, 0, 0, .. "WEBPVP8 "u8];

    private readonly FakeFileStorage _storage = new();

    private SiteContentService MakeService(Data.AppDbContext db) =>
        new(db, _storage, NullLogger<SiteContentService>.Instance);

    private static IFormFile MakeFormFile(string fileName, byte[] bytes, string contentType = "image/jpeg")
    {
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "file", fileName) { Headers = new HeaderDictionary(), ContentType = contentType };
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
    public async Task AddGalleryImageAsync_stores_the_file_under_a_random_gallery_key_and_records_it()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);

        var image = await service.AddGalleryImageAsync(MakeFormFile("My Photo.JPG", Jpeg), "Garden");

        var (key, stored) = Assert.Single(_storage.Objects);
        Assert.Matches("^gallery/[0-9a-f-]{36}\\.jpg$", key);
        Assert.Equal(Jpeg, stored.Bytes);
        Assert.Equal("image/jpeg", stored.ContentType);
        Assert.Equal(key, Assert.Single(db.GalleryImages).FilePath);
        Assert.Equal("Garden", image.Caption);
        Assert.Equal(FakeFileStorage.UrlFor(key), image.Url);
    }

    [Theory]
    [InlineData("a.png", "image/png", ".png")]
    [InlineData("a.gif", "image/gif", ".gif")]
    [InlineData("a.webp", "image/webp", ".webp")]
    [InlineData("a.jpeg", "image/jpeg", ".jpg")]
    public async Task AddGalleryImageAsync_accepts_each_allowed_type(string name, string contentType, string extension)
    {
        using var db = TestDbContextFactory.Create();
        var bytes = contentType switch { "image/png" => Png, "image/gif" => Gif, "image/webp" => Webp, _ => Jpeg };

        await MakeService(db).AddGalleryImageAsync(MakeFormFile(name, bytes), null);

        var (key, stored) = Assert.Single(_storage.Objects);
        Assert.EndsWith(extension, key);
        Assert.Equal(contentType, stored.ContentType);
    }

    [Fact]
    public async Task AddGalleryImageAsync_stores_the_detected_type_not_the_one_the_browser_sent()
    {
        using var db = TestDbContextFactory.Create();

        await MakeService(db).AddGalleryImageAsync(MakeFormFile("a.png", Png, contentType: "text/html"), null);

        Assert.Equal("image/png", Assert.Single(_storage.Objects).Value.ContentType);
    }

    [Theory]
    [InlineData("document.pdf")]
    [InlineData("page.html")]
    [InlineData("photo")]
    public async Task AddGalleryImageAsync_rejects_an_unsupported_extension(string name)
    {
        using var db = TestDbContextFactory.Create();

        await Assert.ThrowsAsync<ArgumentException>(() => MakeService(db).AddGalleryImageAsync(MakeFormFile(name, Jpeg), null));
        Assert.Empty(_storage.Objects);
    }

    [Fact]
    public async Task AddGalleryImageAsync_rejects_a_file_whose_bytes_are_not_the_named_image_type()
    {
        using var db = TestDbContextFactory.Create();
        var html = "<html><script>alert(1)</script></html>"u8.ToArray();

        await Assert.ThrowsAsync<ArgumentException>(() => MakeService(db).AddGalleryImageAsync(MakeFormFile("photo.jpg", html), null));
        await Assert.ThrowsAsync<ArgumentException>(() => MakeService(db).AddGalleryImageAsync(MakeFormFile("photo.png", Jpeg), null));
        Assert.Empty(_storage.Objects);
        Assert.Empty(db.GalleryImages);
    }

    [Fact]
    public async Task AddGalleryImageAsync_rejects_an_empty_file()
    {
        using var db = TestDbContextFactory.Create();

        await Assert.ThrowsAsync<ArgumentException>(() => MakeService(db).AddGalleryImageAsync(MakeFormFile("photo.jpg", []), null));
    }

    [Fact]
    public async Task AddGalleryImageAsync_rejects_a_file_over_8_MB()
    {
        using var db = TestDbContextFactory.Create();
        var big = new byte[8 * 1024 * 1024 + 1];
        Jpeg.CopyTo(big, 0);

        await Assert.ThrowsAsync<ArgumentException>(() => MakeService(db).AddGalleryImageAsync(MakeFormFile("photo.jpg", big), null));
        Assert.Empty(_storage.Objects);
    }

    [Fact]
    public async Task GetSiteContentAsync_gives_each_image_a_short_lived_signed_url()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        await service.AddGalleryImageAsync(MakeFormFile("a.jpg", Jpeg), null);

        var content = await service.GetSiteContentAsync();

        var key = Assert.Single(_storage.Objects).Key;
        Assert.Equal(FakeFileStorage.UrlFor(key), Assert.Single(content.Images).Url);
        Assert.Equal(SiteContentService.ImageUrlLifetime, _storage.LastUrlLifetime);
        Assert.True(SiteContentService.ImageUrlLifetime <= TimeSpan.FromHours(1));
    }

    [Fact]
    public async Task DeleteGalleryImageAsync_removes_the_record_and_the_stored_file()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        var image = await service.AddGalleryImageAsync(MakeFormFile("photo.jpg", Jpeg), null);

        var success = await service.DeleteGalleryImageAsync(image.Id);

        Assert.True(success);
        Assert.Empty(_storage.Objects);
        Assert.Empty(db.GalleryImages);
    }

    [Fact]
    public async Task DeleteGalleryImageAsync_still_removes_the_record_when_storage_fails()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);
        var image = await service.AddGalleryImageAsync(MakeFormFile("photo.jpg", Jpeg), null);
        _storage.FailDeletes = true;

        Assert.True(await service.DeleteGalleryImageAsync(image.Id));
        Assert.Empty(db.GalleryImages);
    }

    [Fact]
    public async Task DeleteGalleryImageAsync_returns_false_for_a_missing_image()
    {
        using var db = TestDbContextFactory.Create();
        var service = MakeService(db);

        Assert.False(await service.DeleteGalleryImageAsync(999));
    }
}

internal class FakeFileStorage : IFileStorage
{
    public record StoredObject(byte[] Bytes, string ContentType);

    public Dictionary<string, StoredObject> Objects { get; } = new();
    public bool FailDeletes { get; set; }
    public TimeSpan? LastUrlLifetime { get; private set; }

    public static string UrlFor(string key) => $"https://storage.test/bucket/{key}?signature=x";

    public async Task UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default)
    {
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, ct);
        Objects[key] = new StoredObject(copy.ToArray(), contentType);
    }

    public Task<string> GetReadUrlAsync(string key, TimeSpan lifetime)
    {
        LastUrlLifetime = lifetime;
        return Task.FromResult(UrlFor(key));
    }

    public Task DeleteAsync(string key, CancellationToken ct = default)
    {
        if (FailDeletes) throw new IOException("storage is down");
        Objects.Remove(key);
        return Task.CompletedTask;
    }
}
