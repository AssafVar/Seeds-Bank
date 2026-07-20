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
        var vertices = ResolveVertices(request);
        var sowingStructure = request.SowingStructure == "staggered" ? "staggered" : "grid";

        var field = new Field
        {
            ProjectId = projectId,
            Name = request.Name,
            Variety = request.Variety,
            ShapeType = request.ShapeType,
            SowingStructure = sowingStructure,
            VerticesJson = JsonSerializer.Serialize(vertices),
            LandWidth = request.ShapeType == "rectangle" ? request.LandWidth : null,
            LandLength = request.ShapeType == "rectangle" ? request.LandLength : null,
            PlantSpacing = request.PlantSpacing,
            RowSpacing = request.RowSpacing,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Fields.Add(field);
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

        _db.Fields.Remove(field);
        await _db.SaveChangesAsync();
        return true;
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
        var positions = PolygonMath.ComputePlantPositions(
            vertices, field.PlantSpacing, field.RowSpacing, field.SowingStructure);

        int? plantsPerRow = null;
        int? numberOfRows = null;
        // Only meaningful for a straight grid on a rectangle - staggered
        // rows alternate their plant count, so there's no single number to
        // report and TotalCapacity (from the real computed positions) is
        // the accurate figure instead.
        if (field.ShapeType == "rectangle" && field.SowingStructure == "grid" &&
            field.LandWidth is { } width && field.LandLength is { } length)
        {
            plantsPerRow = (int)Math.Floor(width / field.PlantSpacing) + 1;
            numberOfRows = (int)Math.Floor(length / field.RowSpacing) + 1;
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
            PlantPositions = positions.Count <= MaxPlantPositions ? positions : null,
            CreatedAt = field.CreatedAt,
        };
    }
}
