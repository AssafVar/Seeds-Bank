namespace SeedsBank.Server.DTOs;

public class SiteContentDto
{
    public string? Description { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactAddress { get; set; }
    public string? VideoUrl { get; set; }
    public List<GalleryImageDto> Images { get; set; } = new();
}
