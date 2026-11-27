using System.ComponentModel.DataAnnotations;

namespace SeedsBank.Server.DTOs;

public class CreateLineRequest
{
    // 1..40 letters, numbers, dashes and spaces: checked in the service so
    // the answer carries { message, field, code }.
    [StringLength(100)]
    public string? Name { get; set; }

    [StringLength(400)]
    public string? OriginNote { get; set; }
}

public class RenameLineRequest
{
    [StringLength(100)]
    public string? NewName { get; set; }

    // The population the breeder branched from; defaults to the line's latest generation.
    public int? FromPopulationId { get; set; }
}

public class SetStableRequest
{
    public bool IsStable { get; set; }
}

public class RenameLineResponse
{
    public LineDto NewLine { get; set; } = null!;
    public LineDto OldLine { get; set; } = null!;
}

public class CreatePopulationRequest
{
    public int LineId { get; set; }

    [StringLength(20)]
    public string? Season { get; set; }

    public int? Year { get; set; }
    public int? FieldId { get; set; }
}
