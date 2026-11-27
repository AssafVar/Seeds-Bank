namespace SeedsBank.Server.DTOs;

public class PlantDto
{
    public string PlantId { get; set; } = null!;
    public string Tag { get; set; } = null!;
    public string ProjectId { get; set; } = null!;
    public int LineId { get; set; }
    public int PopulationId { get; set; }
    public string? Kind { get; set; }
    public int Generation { get; set; }
    public string Label { get; set; } = null!;
    public ParentRefDto? Mother { get; set; }
    public ParentRefDto? Father { get; set; }
    public bool IsSelf { get; set; }
    public string? FruitColor { get; set; }
    public string? FruitWeight { get; set; }
    public string? SeedColor { get; set; }
    public string? SeedWeight { get; set; }
    public int ChildCount { get; set; }
    public int Version { get; set; }
    public DateTime CreatedAt { get; set; }
}

// A parent as shown on a plant. Removed: the parent was deleted; PlantId is
// null and Tag is the tag it had.
public class ParentRefDto
{
    public string? PlantId { get; set; }
    public string Tag { get; set; } = null!;
    public bool Removed { get; set; }
}
