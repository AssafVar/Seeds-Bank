namespace SeedsBank.Server.Services.Pedigree;

// Stable machine codes for every pedigree error. The client maps on these as
// well as on the message text.
public static class PedigreeCodes
{
    public const string OneParent = "one_parent";
    public const string ParentsRequired = "parents_required";
    public const string ParentNotFound = "parent_not_found";
    public const string OwnParent = "own_parent";
    public const string DescendantParent = "descendant_parent";
    public const string PedigreeTooDeep = "pedigree_too_deep";
    public const string FounderNoParents = "founder_no_parents";
    public const string NoParentsFoundersOnly = "no_parents_founders_only";
    public const string LineNotFound = "line_not_found";
    public const string LineNotAllowed = "line_not_allowed";
    public const string LineConflict = "line_conflict";
    public const string FieldNotFound = "field_not_found";
    public const string PopulationNotFound = "population_not_found";
    public const string InvalidTag = "invalid_tag";
    public const string InvalidLineName = "invalid_line_name";
    public const string InvalidInput = "invalid_input";
    public const string QueryTooLong = "query_too_long";
    public const string QuotaExceeded = "quota_exceeded";
    public const string TagTaken = "tag_taken";
    public const string LineNameTaken = "line_name_taken";
    public const string HasChildren = "has_children";
    public const string VersionConflict = "version_conflict";

    // Added with the services (step 1, second batch).
    public const string WriteConflict = "write_conflict";
    public const string FoundersLine = "founders_line";
    public const string LineNotEmpty = "line_not_empty";
    public const string LineHasSuccessor = "line_has_successor";
    public const string PopulationNotEmpty = "population_not_empty";
    public const string PopulationExists = "population_exists";
    public const string ProjectIdTaken = "project_id_taken";
}

// Which request field an error belongs to (the client puts the message under
// that input).
public static class PedigreeFields
{
    public const string Mother = "mother";
    public const string Father = "father";
    public const string Tag = "tag";
    public const string LineName = "lineName";
    public const string Line = "line";
    public const string FieldId = "fieldId";
    public const string PopulationId = "populationId";
}

// A rule violation with the response shape { message, field, code }. The
// message contains tags or ids the caller sent, so it must never be passed to
// a logger (log the Code, the project id and counts only).
public sealed class PedigreeException : Exception
{
    public PedigreeException(string? field, string code, string message, int statusCode = 400)
        : base(message)
    {
        Field = field;
        Code = code;
        StatusCode = statusCode;
    }

    public string? Field { get; }
    public string Code { get; }
    public int StatusCode { get; }

    public static PedigreeException Conflict(string? field, string code, string message) =>
        new(field, code, message, 409);

    // Unknown and foreign ids must give byte-identical answers, so these use
    // fixed text and echo only what the caller sent.
    public static PedigreeException ParentNotFound(string field, string? sentId) =>
        new(field, PedigreeCodes.ParentNotFound, $"There is no plant {Echo(sentId)} in this project.");

    public static PedigreeException LineNotFound() =>
        new(PedigreeFields.Line, PedigreeCodes.LineNotFound, "There is no such line in this project.");

    public static PedigreeException PopulationNotFound() =>
        new(PedigreeFields.PopulationId, PedigreeCodes.PopulationNotFound, "There is no such population in this project.");

    public static PedigreeException FieldNotFound() =>
        new(PedigreeFields.FieldId, PedigreeCodes.FieldNotFound, "There is no such field in this project.");

    // Caller-supplied text is cut so a huge id cannot bloat a response.
    private static string Echo(string? value)
    {
        var text = (value ?? string.Empty).Trim();
        return text.Length <= 64 ? text : text[..64];
    }
}
