using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("gallery_images")]
public class GalleryImage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    // The object's key in file storage (e.g. "gallery/<guid>.jpg"), not a path on disk.
    [Column("file_path")]
    public string FilePath { get; set; } = null!;

    [Column("caption")]
    public string? Caption { get; set; }

    [Column("uploaded_at")]
    public DateTime UploadedAt { get; set; }
}
