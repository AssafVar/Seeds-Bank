using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("site_content")]
public class SiteContent
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("contact_email")]
    public string? ContactEmail { get; set; }

    [Column("contact_phone")]
    public string? ContactPhone { get; set; }

    [Column("contact_address")]
    public string? ContactAddress { get; set; }

    [Column("video_url")]
    public string? VideoUrl { get; set; }
}
