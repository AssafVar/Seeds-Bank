using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("fields")]
public class Field
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("project_id")]
    public string ProjectId { get; set; } = null!;

    [Column("name")]
    public string Name { get; set; } = null!;

    [Column("land_width")]
    public double LandWidth { get; set; }

    [Column("land_length")]
    public double LandLength { get; set; }

    [Column("plant_spacing")]
    public double PlantSpacing { get; set; }

    [Column("row_spacing")]
    public double RowSpacing { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
