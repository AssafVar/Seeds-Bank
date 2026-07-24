namespace SeedsBank.Server.DTOs;

public class UpdateFieldGeometryRequest
{
    // Exactly one is populated - GeoVertices for a sub-field of a map-anchored
    // large field, Vertices for a sub-field of a map-less small field. See
    // FieldService.UpdateGeometryAsync.
    public List<GeoVertexDto>? GeoVertices { get; set; }
    public List<VertexDto>? Vertices { get; set; }
}
