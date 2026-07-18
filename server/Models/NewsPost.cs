using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("news_posts")]
public class NewsPost
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("title")]
    public string Title { get; set; } = null!;

    [Column("body")]
    public string Body { get; set; } = null!;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
