using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface ISiteContentService
{
    Task<SiteContentDto> GetSiteContentAsync();
    Task UpdateSiteContentAsync(UpdateSiteContentRequest request);
    Task<GalleryImageDto> AddGalleryImageAsync(IFormFile file, string? caption);
    Task<bool> DeleteGalleryImageAsync(int id);
}
