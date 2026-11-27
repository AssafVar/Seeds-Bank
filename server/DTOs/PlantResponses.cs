namespace SeedsBank.Server.DTOs;

public class CreatePlantsResponse
{
    public List<PlantDto> Plants { get; set; } = new();
    public LineDto Line { get; set; } = null!;
}

public class UpdateParentsResponse
{
    public PlantDto Plant { get; set; } = null!;
    public string PreviousLabel { get; set; } = null!;
    public int PreviousLineId { get; set; }
    public int PreviousPopulationId { get; set; }

    // The parents before the change (null when a parent had been removed), so
    // an undo does not depend on client state.
    public string? PreviousMotherPlantId { get; set; }
    public string? PreviousFatherPlantId { get; set; }

    // All descendants of the plant; they keep their generation.
    public int DescendantCount { get; set; }
    public LineDto Line { get; set; } = null!;
}

public class DeletePlantResponse
{
    public int ChildrenAffected { get; set; }
}

public class PlantCountsDto
{
    public int Total { get; set; }
    public List<LineCountDto> Lines { get; set; } = new();
    public List<PopulationCountDto> Populations { get; set; } = new();
}

public class LineCountDto
{
    public int LineId { get; set; }
    public int Count { get; set; }
}

public class PopulationCountDto
{
    public int PopulationId { get; set; }
    public int Count { get; set; }
}

public class PlacementPreviewDto
{
    public bool IsSelf { get; set; }
    public bool StartsNewLine { get; set; }
    public bool ForcedNewLine { get; set; }
    public List<LineChoiceDto> AllowedLineChoices { get; set; } = new();
    public PreviewLineDto Line { get; set; } = null!;
    public string Label { get; set; } = null!;
    public string SuggestedTag { get; set; } = null!;
    public PreviewPopulationDto Population { get; set; } = null!;
}

public class LineChoiceDto
{
    public int? LineId { get; set; }
    public string Name { get; set; } = null!;
    public bool IsNew { get; set; }
}

public class PreviewLineDto
{
    public int? Id { get; set; }
    public string Name { get; set; } = null!;
}

public class PreviewPopulationDto
{
    // joins | creates
    public string Action { get; set; } = null!;
    public string Name { get; set; } = null!;
    public int PlantCount { get; set; }
}
