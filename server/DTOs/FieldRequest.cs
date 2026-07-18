using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

public class FieldRequest
{
    [Required]
    public string Name { get; set; } = null!;

    [Range(0.01, double.MaxValue)]
    public double LandWidth { get; set; }

    [Range(0.01, double.MaxValue)]
    public double LandLength { get; set; }

    [Range(0.01, double.MaxValue)]
    public double PlantSpacing { get; set; }

    [Range(0.01, double.MaxValue)]
    public double RowSpacing { get; set; }
}
