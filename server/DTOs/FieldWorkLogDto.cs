namespace SeedsBank.Server.DTOs;

public class FieldWorkLogDto
{
    public int Id { get; set; }
    public int FieldId { get; set; }
    public int WorkerId { get; set; }
    public string WorkerName { get; set; } = null!;
    public DateTime WorkDate { get; set; }
    public double HoursWorked { get; set; }
    public double HourlyRateAtEntry { get; set; }
    public double Cost { get; set; }
    public DateTime CreatedAt { get; set; }
}
