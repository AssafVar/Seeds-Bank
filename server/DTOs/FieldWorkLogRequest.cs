namespace SeedsBank.Server.DTOs;

public class FieldWorkLogRequest
{
    public int WorkerId { get; set; }
    public DateTime WorkDate { get; set; }
    public double HoursWorked { get; set; }
}
