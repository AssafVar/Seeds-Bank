using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("projects")]
public class Project
{
    [Key]
    [Column("project_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public string ProjectId { get; set; } = null!;

    [Column("user_id")]
    public string UserId { get; set; } = null!;

    [Column("project_name")]
    public string ProjectName { get; set; } = null!;

    [Column("plant_type")]
    public string PlantType { get; set; } = null!;

    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Column("last_update")]
    public DateTime LastUpdate { get; set; }
}
