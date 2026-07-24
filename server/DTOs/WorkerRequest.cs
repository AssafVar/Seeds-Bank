namespace SeedsBank.Server.DTOs;

public class WorkerRequest
{
    public string Name { get; set; } = null!;
    public string? Role { get; set; }
    public double HourlyRate { get; set; }
}
