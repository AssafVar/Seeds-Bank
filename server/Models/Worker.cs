using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("workers")]
public class Worker
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = null!;

    [Column("role")]
    public string? Role { get; set; }

    [Column("hourly_rate")]
    public double HourlyRate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
