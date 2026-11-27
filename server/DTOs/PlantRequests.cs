using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

// One request type per action. Nothing here is an entity, and none of
// userId, projectId, kind, generation, code, isFounders, nextSeq, rowVersion,
// childCount or createdAt can be bound: extra JSON fields are ignored.
public class CreatePlantsRequest
{
    // Optional custom tag (then Count must be 1); generated when omitted.
    [StringLength(100)]
    public string? Tag { get; set; }

    [StringLength(255)]
    public string? MotherPlantId { get; set; }

    [StringLength(255)]
    public string? FatherPlantId { get; set; }

    public int? LineId { get; set; }
    public bool StartNewLine { get; set; }

    [StringLength(100)]
    public string? NewLineName { get; set; }

    [StringLength(20)]
    public string? Season { get; set; }

    public int? Year { get; set; }
    public int? FieldId { get; set; }

    // Prefill/adopt an empty placeholder population.
    public int? PopulationId { get; set; }

    [Range(1, 500)]
    public int Count { get; set; } = 1;

    [StringLength(400)]
    public string? FruitColor { get; set; }

    [StringLength(400)]
    public string? FruitWeight { get; set; }

    [StringLength(400)]
    public string? SeedColor { get; set; }

    [StringLength(400)]
    public string? SeedWeight { get; set; }
}

// Traits only. A null field is left as it is; an empty or blank string clears
// the trait. Tag, line, generation and parents are not bindable.
public class UpdatePlantRequest
{
    [StringLength(400)]
    public string? FruitColor { get; set; }

    [StringLength(400)]
    public string? FruitWeight { get; set; }

    [StringLength(400)]
    public string? SeedColor { get; set; }

    [StringLength(400)]
    public string? SeedWeight { get; set; }

    [Range(1, int.MaxValue)]
    public int Version { get; set; }
}

public class UpdateParentsRequest
{
    // Both are required, but the rule (one_parent / parents_required) is
    // checked in the service so the answer carries { message, field, code }.
    [StringLength(255)]
    public string? MotherPlantId { get; set; }

    [StringLength(255)]
    public string? FatherPlantId { get; set; }

    public int? LineId { get; set; }
    public bool StartNewLine { get; set; }

    [StringLength(100)]
    public string? NewLineName { get; set; }

    [Range(1, int.MaxValue)]
    public int Version { get; set; }
}

public class PlantListQuery
{
    public int? LineId { get; set; }
    public int? PopulationId { get; set; }

    [StringLength(255)]
    public string? ParentId { get; set; }

    // Longer than 100 characters is a 400 query_too_long from the service.
    [StringLength(2000)]
    public string? Q { get; set; }

    public bool LatestOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public class PlantCountsQuery
{
    [StringLength(2000)]
    public string? Q { get; set; }

    public int? LineId { get; set; }
    public bool LatestOnly { get; set; }
}

public class PlacementPreviewQuery
{
    [StringLength(255)]
    public string? MotherPlantId { get; set; }

    [StringLength(255)]
    public string? FatherPlantId { get; set; }

    public int? LineId { get; set; }
    public bool StartNewLine { get; set; }

    [StringLength(100)]
    public string? NewLineName { get; set; }

    [StringLength(20)]
    public string? Season { get; set; }

    public int? Year { get; set; }
    public int? FieldId { get; set; }
    public int? PopulationId { get; set; }
}
