using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

// How a line came to be: its cross parents, or the line it was branched from.
[Table("line_origins")]
public class LineOrigin
{
    public const string RoleMother = "mother";
    public const string RoleFather = "father";
    public const string RoleForkedFrom = "forked_from";

    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("line_id")]
    public int LineId { get; set; }

    public Line Line { get; set; } = null!;

    [Column("role")]
    [MaxLength(12)]
    public string Role { get; set; } = null!;

    [Column("source_line_id")]
    public int? SourceLineId { get; set; }

    public Line? SourceLine { get; set; }

    // Snapshots, so the origin text survives a deleted source line.
    [Column("source_line_name")]
    [MaxLength(100)]
    public string SourceLineName { get; set; } = null!;

    [Column("source_label")]
    [MaxLength(10)]
    public string SourceLabel { get; set; } = null!;

    [Column("source_plant_tag")]
    [MaxLength(40)]
    public string? SourcePlantTag { get; set; }
}
