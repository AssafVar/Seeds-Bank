using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Storage;

namespace SeedsBank.Server.Services;

public class SiteContentService : ISiteContentService
{
    private const long MaxFileSizeBytes = 8 * 1024 * 1024;
    private const string GalleryKeyPrefix = "gallery/";

    // The bucket is private: the page gets a signed link per image, valid long enough for one visit.
    internal static readonly TimeSpan ImageUrlLifetime = TimeSpan.FromHours(1);

    private readonly AppDbContext _db;
    private readonly IFileStorage _storage;
    private readonly ILogger<SiteContentService> _logger;

    public SiteContentService(AppDbContext db, IFileStorage storage, ILogger<SiteContentService> logger)
    {
        _db = db;
        _storage = storage;
        _logger = logger;
    }

    public async Task<SiteContentDto> GetSiteContentAsync()
    {
        var content = await GetOrCreateSiteContentAsync();
        var images = await _db.GalleryImages.AsNoTracking()
            .OrderByDescending(i => i.UploadedAt)
            .ToListAsync();

        return new SiteContentDto
        {
            Description = content.Description,
            ContactEmail = content.ContactEmail,
            ContactPhone = content.ContactPhone,
            ContactAddress = content.ContactAddress,
            VideoUrl = content.VideoUrl,
            Images = await ToImageDtosAsync(images),
        };
    }

    public async Task UpdateSiteContentAsync(UpdateSiteContentRequest request)
    {
        var content = await GetOrCreateSiteContentAsync();
        content.Description = request.Description;
        content.ContactEmail = request.ContactEmail;
        content.ContactPhone = request.ContactPhone;
        content.ContactAddress = request.ContactAddress;
        content.VideoUrl = request.VideoUrl;
        await _db.SaveChangesAsync();
    }

    public async Task<GalleryImageDto> AddGalleryImageAsync(IFormFile file, string? caption)
    {
        if (file is null || file.Length == 0)
        {
            throw new ArgumentException("A file is required.");
        }
        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException("File is too large (max 8 MB).");
        }

        var type = await ImageTypeValidator.DetectAsync(file);
        if (type is null)
        {
            throw new ArgumentException("Unsupported file type. Allowed: jpg, jpeg, png, webp, gif.");
        }

        var key = $"{GalleryKeyPrefix}{Guid.NewGuid()}{type.Value.Extension}";
        await using (var stream = file.OpenReadStream())
        {
            await _storage.UploadAsync(key, stream, type.Value.ContentType);
        }

        var image = new GalleryImage
        {
            FilePath = key,
            Caption = caption,
            UploadedAt = DateTime.UtcNow,
        };
        _db.GalleryImages.Add(image);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch
        {
            await DeleteStoredFileAsync(key);
            throw;
        }

        return await ToImageDtoAsync(image);
    }

    public async Task<bool> DeleteGalleryImageAsync(int id)
    {
        var image = await _db.GalleryImages.FirstOrDefaultAsync(i => i.Id == id);
        if (image is null)
        {
            return false;
        }

        _db.GalleryImages.Remove(image);
        await _db.SaveChangesAsync();

        await DeleteStoredFileAsync(image.FilePath);
        return true;
    }

    // The row is the source of truth: a file left behind by a failed delete is only wasted space, so log and move on.
    private async Task DeleteStoredFileAsync(string key)
    {
        try
        {
            await _storage.DeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("A gallery file could not be deleted from storage ({ExceptionType})", ex.GetType().Name);
        }
    }

    private async Task<SiteContent> GetOrCreateSiteContentAsync()
    {
        var content = await _db.SiteContents.FirstOrDefaultAsync();
        if (content is not null)
        {
            return content;
        }

        content = new SiteContent();
        _db.SiteContents.Add(content);
        await _db.SaveChangesAsync();
        return content;
    }

    private async Task<List<GalleryImageDto>> ToImageDtosAsync(List<GalleryImage> images)
    {
        var dtos = new List<GalleryImageDto>(images.Count);
        foreach (var image in images)
        {
            dtos.Add(await ToImageDtoAsync(image));
        }
        return dtos;
    }

    private async Task<GalleryImageDto> ToImageDtoAsync(GalleryImage image) => new()
    {
        Id = image.Id,
        Url = await _storage.GetReadUrlAsync(image.FilePath, ImageUrlLifetime),
        Caption = image.Caption,
        UploadedAt = image.UploadedAt,
    };
}
