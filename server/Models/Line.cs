using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

// A named breeding line, or the built-in Founders line of a project.
[Table("lines")]
public class Line
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("project_id")]
    public string ProjectId { get; set; } = null!;

    // Unique per project (case-insensitive: the column is citext).
    // New names are validated to 1..40 characters; the column is wider for
    // legacy names.
    [Column("name")]
    [MaxLength(100)]
    public string Name { get; set; } = null!;

    // Tag prefix: uppercase ASCII letters/digits, unique per project,
    // immutable. Founders = "P".
    [Column("code")]
    [MaxLength(6)]
    public string Code { get; set; } = null!;

    [Column("is_founders")]
    public bool IsFounders { get; set; }

    [Column("is_stable")]
    public bool IsStable { get; set; }

    [Column("stable_marked_at")]
    public DateTime? StableMarkedAt { get; set; }

    // The most recent fork of this line (where auto-placed children go).
    [Column("successor_line_id")]
    public int? SuccessorLineId { get; set; }

    public Line? Successor { get; set; }

    [Column("origin_note")]
    [MaxLength(200)]
    public string? OriginNote { get; set; }

    // Tag counter for the whole line; also an optimistic-concurrency token
    // so two parallel creates cannot hand out the same number.
    [Column("next_seq")]
    public int NextSeq { get; set; } = 1;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Population> Populations { get; set; } = new List<Population>();
    public ICollection<LineOrigin> Origins { get; set; } = new List<LineOrigin>();
}
