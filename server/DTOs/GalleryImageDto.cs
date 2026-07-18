namespace SeedsBank.Server.DTOs;

public class GalleryImageDto
{
    public int Id { get; set; }
    public string Url { get; set; } = null!;
    public string? Caption { get; set; }
    public DateTime UploadedAt { get; set; }
}
