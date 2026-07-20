namespace SeedsBank.Server.DTOs;

public class UpdateFieldGeometryRequest
{
    public List<GeoVertexDto> GeoVertices { get; set; } = new();
}
