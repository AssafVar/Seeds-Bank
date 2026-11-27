using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

// Plants of one line, kind and generation grown in one season and place.
[Table("populations")]
public class Population
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    // Denormalised owner: always equal to the line's ProjectId, set from the
    // line when created and never from a request. Lets every population
    // lookup be (ProjectId, Id).
    [Column("project_id")]
    public string ProjectId { get; set; } = null!;

    [Column("line_id")]
    public int LineId { get; set; }

    public Line Line { get; set; } = null!;

    // 'P', 'F' or 'S'; null only for an empty placeholder.
    [Column("kind")]
    public char? Kind { get; set; }

    [Column("generation")]
    public int? Generation { get; set; }

    // Spring, Summer, Autumn, Winter; null = unspecified (legacy).
    [Column("season")]
    [MaxLength(10)]
    public string? Season { get; set; }

    [Column("year")]
    public short? Year { get; set; }

    [Column("field_id")]
    public int? FieldId { get; set; }

    public Field? Field { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
