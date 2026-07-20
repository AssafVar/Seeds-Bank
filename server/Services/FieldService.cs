using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class FieldService : IFieldService
{
    private const int MaxPlantPositions = 400;

    private readonly AppDbContext _db;

    public FieldService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<FieldDto>> GetByProjectAsync(string projectId)
    {
        var fields = await _db.Fields.AsNoTracking()
            .Where(f => f.ProjectId == projectId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return fields.Select(ToDto).ToList();
    }

    public async Task<FieldDto> CreateAsync(string projectId, FieldRequest request)
    {
        Field? parent = null;
        if (request.ParentFieldId is { } parentId)
        {
            parent = await _db.Fields.FirstOrDefaultAsync(f => f.Id == parentId && f.ProjectId == projectId);
            if (parent is null)
            {
                throw new ArgumentException("Parent field not found.");
            }
            if (parent.ParentFieldId is not null)
            {
                throw new ArgumentException("Sub-fields cannot be nested further than one level.");
            }
        }

        // A large field is a new, map-drawn, top-level boundary - it carries
        // no planting data itself, only its future sub-fields do.
        var isLargeField = parent is null && request.GeoVertices is { Count: >= 3 };

        Field field;
        if (isLargeField)
        {
            var (originLat, originLng) = GeoMath.Centroid(request.GeoVertices!);
            var vertices = GeoMath.Project(request.GeoVertices!, originLat, originLng);

            field = new Field
            {
                ProjectId = projectId,
                Name = request.Name,
                Variety = null,
                ShapeType = "polygon",
                SowingStructure = "grid",
                VerticesJson = JsonSerializer.Serialize(vertices),
                GeoVerticesJson = JsonSerializer.Serialize(request.GeoVertices),
                OriginLat = originLat,
                OriginLng = originLng,
                LandWidth = null,
                LandLength = null,
                PlantSpacing = null,
                RowSpacing = null,
                CreatedAt = DateTime.UtcNow,
            };
        }
        else if (parent is not null)
        {
            ValidateSpacing(request.PlantSpacing, request.RowSpacing);
            var vertices = ProjectAndValidateWithinParent(request.GeoVertices, parent);

            field = new Field
            {
                ProjectId = projectId,
                ParentFieldId = parent.Id,
                Name = request.Name,
                Variety = request.Variety,
                ShapeType = "polygon",
                SowingStructure = request.SowingStructure == "staggered" ? "staggered" : "grid",
                VerticesJson = JsonSerializer.Serialize(vertices),
                GeoVerticesJson = JsonSerializer.Serialize(request.GeoVertices),
                LandWidth = null,
                LandLength = null,
                PlantSpacing = request.PlantSpacing,
                RowSpacing = request.RowSpacing,
                CreatedAt = DateTime.UtcNow,
            };
        }
        else
        {
            ValidateSpacing(request.PlantSpacing, request.RowSpacing);
            var vertices = ResolveVertices(request);

            field = new Field
            {
                ProjectId = projectId,
                Name = request.Name,
                Variety = request.Variety,
                ShapeType = request.ShapeType,
                SowingStructure = request.SowingStructure == "staggered" ? "staggered" : "grid",
                VerticesJson = JsonSerializer.Serialize(vertices),
                LandWidth = request.ShapeType == "rectangle" ? request.LandWidth : null,
                LandLength = request.ShapeType == "rectangle" ? request.LandLength : null,
                PlantSpacing = request.PlantSpacing,
                RowSpacing = request.RowSpacing,
                CreatedAt = DateTime.UtcNow,
            };
        }

        _db.Fields.Add(field);
        await _db.SaveChangesAsync();

        return ToDto(field);
    }

    public async Task<FieldDto?> UpdateGeometryAsync(string projectId, int fieldId, List<GeoVertexDto> geoVertices)
    {
        var field = await _db.Fields.FirstOrDefaultAsync(f => f.Id == fieldId && f.ProjectId == projectId);
        if (field is null)
        {
            return null;
        }

        if (field.ParentFieldId is not { } parentId)
        {
            throw new ArgumentException("Only sub-fields can be repositioned this way.");
        }

        var parent = await _db.Fields.FirstOrDefaultAsync(f => f.Id == parentId && f.ProjectId == projectId);
        if (parent is null)
        {
            throw new ArgumentException("Parent field not found.");
        }

        var vertices = ProjectAndValidateWithinParent(geoVertices, parent);
        field.VerticesJson = JsonSerializer.Serialize(vertices);
        field.GeoVerticesJson = JsonSerializer.Serialize(geoVertices);
        await _db.SaveChangesAsync();

        return ToDto(field);
    }

    public async Task<bool> DeleteAsync(string projectId, int fieldId)
    {
        var field = await _db.Fields
            .FirstOrDefaultAsync(f => f.Id == fieldId && f.ProjectId == projectId);
        if (field is null)
        {
            return false;
        }

        // Children cascade via the FK configured in AppDbContext.OnModelCreating.
        _db.Fields.Remove(field);
        await _db.SaveChangesAsync();
        return true;
    }

    private static void ValidateSpacing(double? plantSpacing, double? rowSpacing)
    {
        if (plantSpacing is not > 0 || rowSpacing is not > 0)
        {
            throw new ArgumentException("Plant spacing and row spacing must be positive.");
        }
    }

    // Shared by CreateAsync (new sub-field) and UpdateGeometryAsync (moving
    // an existing one) - both need the same "project through the parent's
    // origin, then reject anything that lands outside its boundary" check.
    private static List<VertexDto> ProjectAndValidateWithinParent(List<GeoVertexDto>? geoVertices, Field parent)
    {
        if (geoVertices is not { Count: >= 3 })
        {
            throw new ArgumentException("A sub-field needs a boundary with at least 3 points.");
        }
        if (parent.OriginLat is not { } originLat || parent.OriginLng is not { } originLng)
        {
            throw new ArgumentException("The large field has no map boundary to anchor to.");
        }

        var vertices = GeoMath.Project(geoVertices, originLat, originLng);
        var parentVertices = JsonSerializer.Deserialize<List<VertexDto>>(parent.VerticesJson) ?? new List<VertexDto>();
        if (vertices.Any(v => !PolygonMath.IsInside(v.X, v.Y, parentVertices)))
        {
            throw new ArgumentException("Sub-field must stay within the large field's boundary.");
        }

        return vertices;
    }

    // A rectangle is stored as its own 4-corner polygon so every field -
    // rectangle or freehand - shares one capacity/area calculation path
    // (see PolygonMath).
    private static List<VertexDto> ResolveVertices(FieldRequest request)
    {
        if (request.ShapeType == "polygon")
        {
            if (request.Vertices is null || request.Vertices.Count < 3)
            {
                throw new ArgumentException("A polygon needs at least 3 points.");
            }

            return request.Vertices;
        }

        if (request.LandWidth is not > 0 || request.LandLength is not > 0)
        {
            throw new ArgumentException("Land width and length must be positive.");
        }

        var width = request.LandWidth.Value;
        var length = request.LandLength.Value;
        return new List<VertexDto>
        {
            new() { X = 0, Y = 0 },
            new() { X = width, Y = 0 },
            new() { X = width, Y = length },
            new() { X = 0, Y = length },
        };
    }

    private static FieldDto ToDto(Field field)
    {
        var vertices = JsonSerializer.Deserialize<List<VertexDto>>(field.VerticesJson) ?? new List<VertexDto>();
        var geoVertices = field.GeoVerticesJson is null
            ? null
            : JsonSerializer.Deserialize<List<GeoVertexDto>>(field.GeoVerticesJson);

        // A large-field container has no spacing of its own, so there is no
        // capacity/plant-position math to run - only its sub-fields sow
        // anything.
        List<VertexDto> positions = new();
        int? plantsPerRow = null;
        int? numberOfRows = null;
        var isPreviewApproximate = false;
        List<VertexDto>? previewPositions = null;

        if (field.PlantSpacing is { } plantSpacing && field.RowSpacing is { } rowSpacing)
        {
            positions = PolygonMath.ComputePlantPositions(vertices, plantSpacing, rowSpacing, field.SowingStructure);

            // Only meaningful for a straight grid on a rectangle - staggered
            // rows alternate their plant count, so there's no single number to
            // report and TotalCapacity (from the real computed positions) is
            // the accurate figure instead.
            if (field.ShapeType == "rectangle" && field.SowingStructure == "grid" &&
                field.LandWidth is { } width && field.LandLength is { } length)
            {
                plantsPerRow = (int)Math.Floor(width / plantSpacing) + 1;
                numberOfRows = (int)Math.Floor(length / rowSpacing) + 1;
            }

            // Always ship a preview, even for very dense fields - a thinned,
            // shape-accurate approximation beats no visual at all. TotalCapacity
            // stays exact regardless of which set is used for drawing.
            isPreviewApproximate = positions.Count > MaxPlantPositions;
            previewPositions = isPreviewApproximate
                ? PolygonMath.ComputeThinnedPositions(
                    vertices, plantSpacing, rowSpacing, field.SowingStructure,
                    positions.Count, MaxPlantPositions)
                : positions;
        }

        return new FieldDto
        {
            Id = field.Id,
            Name = field.Name,
            Variety = field.Variety,
            ShapeType = field.ShapeType,
            SowingStructure = field.SowingStructure,
            Vertices = vertices,
            LandWidth = field.LandWidth,
            LandLength = field.LandLength,
            PlantSpacing = field.PlantSpacing,
            RowSpacing = field.RowSpacing,
            Area = PolygonMath.Area(vertices),
            PlantsPerRow = plantsPerRow,
            NumberOfRows = numberOfRows,
            TotalCapacity = positions.Count,
            PlantPositions = previewPositions,
            IsPreviewApproximate = isPreviewApproximate,
            ParentFieldId = field.ParentFieldId,
            GeoVertices = geoVertices,
            CreatedAt = field.CreatedAt,
        };
    }
}
