namespace SeedsBank.Server.DTOs;

public class WorkerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Role { get; set; }
    public double HourlyRate { get; set; }
    public DateTime CreatedAt { get; set; }
}
