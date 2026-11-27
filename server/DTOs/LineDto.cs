namespace SeedsBank.Server.DTOs;

public class LineDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Code { get; set; } = null!;
    public bool IsFounders { get; set; }
    public bool IsStable { get; set; }
    public DateTime? StableMarkedAt { get; set; }
    public bool LooksStable { get; set; }

    // stable | looksStable | segregating | none
    public string StabilityState { get; set; } = "none";
    public StabilityDto Stability { get; set; } = new();
    public int? SuccessorLineId { get; set; }
    public List<LineForkDto> Forks { get; set; } = new();
    public string? OriginNote { get; set; }
    public LineOriginDto Origin { get; set; } = new();
    public int PlantCount { get; set; }
    public List<PopulationDto> Populations { get; set; } = new();
}

public class StabilityDto
{
    public List<string> GenerationsJudged { get; set; } = new();
}

public class LineForkDto
{
    public int LineId { get; set; }
    public string Name { get; set; } = null!;
}

public class LineOriginDto
{
    // founders | cross | self | renamed | manual | imported
    public string Kind { get; set; } = "imported";
    public List<LineOriginParentDto> Parents { get; set; } = new();
    public LineOriginForkDto? ForkedFrom { get; set; }
}

public class LineOriginParentDto
{
    public string Role { get; set; } = null!;
    public int? LineId { get; set; }
    public string LineName { get; set; } = null!;
    public string Label { get; set; } = null!;
    public string? PlantTag { get; set; }
}

public class LineOriginForkDto
{
    public int? LineId { get; set; }
    public string LineName { get; set; } = null!;
    public string Label { get; set; } = null!;
}

public class PopulationDto
{
    public int Id { get; set; }
    public string? Kind { get; set; }
    public int? Generation { get; set; }
    public string? Label { get; set; }
    public string Name { get; set; } = null!;
    public string? Season { get; set; }
    public int? Year { get; set; }
    public int? FieldId { get; set; }
    public string? FieldName { get; set; }
    public int PlantCount { get; set; }
    public bool IsLatestGeneration { get; set; }
}
