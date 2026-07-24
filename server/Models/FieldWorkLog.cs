using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("field_work_logs")]
public class FieldWorkLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("field_id")]
    public int FieldId { get; set; }
    public Field Field { get; set; } = null!;

    [Column("worker_id")]
    public int WorkerId { get; set; }
    public Worker Worker { get; set; } = null!;

    [Column("work_date")]
    public DateTime WorkDate { get; set; }

    [Column("hours_worked")]
    public double HoursWorked { get; set; }

    // Copied from the worker's HourlyRate at the moment this entry is
    // logged, so a later change to the roster rate doesn't retroactively
    // change the cost of hours already worked.
    [Column("hourly_rate_at_entry")]
    public double HourlyRateAtEntry { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
