using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class SiteContentService : ISiteContentService
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
    };
    private const long MaxFileSizeBytes = 8 * 1024 * 1024;
    private const string GalleryRelativeDirectory = "uploads/gallery";

    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public SiteContentService(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
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
            Images = images.Select(ToImageDto).ToList(),
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

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException("Unsupported file type. Allowed: jpg, jpeg, png, webp, gif.");
        }

        var galleryDir = Path.Combine(_env.WebRootPath, GalleryRelativeDirectory);
        Directory.CreateDirectory(galleryDir);

        var storedFileName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(galleryDir, storedFileName);

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var image = new GalleryImage
        {
            FilePath = $"{GalleryRelativeDirectory}/{storedFileName}",
            Caption = caption,
            UploadedAt = DateTime.UtcNow,
        };
        _db.GalleryImages.Add(image);
        await _db.SaveChangesAsync();

        return ToImageDto(image);
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

        var fullPath = Path.Combine(_env.WebRootPath, image.FilePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return true;
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

    private static GalleryImageDto ToImageDto(GalleryImage image) => new()
    {
        Id = image.Id,
        Url = $"/{image.FilePath}",
        Caption = image.Caption,
        UploadedAt = image.UploadedAt,
    };
}
