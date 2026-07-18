namespace SeedsBank.Server.DTOs;

public class UploadGalleryImageRequest
{
    public IFormFile File { get; set; } = null!;
    public string? Caption { get; set; }
}
