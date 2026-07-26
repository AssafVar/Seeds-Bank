using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class FieldService : IFieldService
{
    private const int MaxPlantPositions = 400;

    // Grower-set lifecycle stage - anything else (including null) falls
    // back to "planning" rather than being rejected outright, since this
    // isn't safety-critical data worth a hard 400 over.
    private static readonly HashSet<string> ValidStatuses = new()
    {
        "planning", "sown", "growing", "harvested",
    };

    private readonly AppDbContext _db;

    public FieldService(AppDbContext db)
    {
        _db = db;
    }

    // Sub-fields always ride along with their parent (the UI groups by
    // ParentFieldId), so only top-level rows - containers and legacy
    // standalone fields alike - are paged; a page's sub-fields are fetched
    // separately by parent id and appended unpaged.
    public async Task<PagedResultDto<FieldDto>> GetByProjectAsync(string projectId, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var topLevelQuery = _db.Fields.AsNoTracking()
            .Where(f => f.ProjectId == projectId && f.ParentFieldId == null)
            .OrderByDescending(f => f.CreatedAt);

        var totalCount = await topLevelQuery.CountAsync();
        var pageFields = await topLevelQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var pageIds = pageFields.Select(f => f.Id).ToList();
        var subFields = await _db.Fields.AsNoTracking()
            .Where(f => f.ProjectId == projectId && f.ParentFieldId != null && pageIds.Contains(f.ParentFieldId!.Value))
            .ToListAsync();

        return new PagedResultDto<FieldDto>
        {
            Items = pageFields.Concat(subFields).Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
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
        // no planting data itself, only its future sub-fields do. A small
        // field is the same idea without ever touching a map: its boundary
        // is drawn directly in local meters (no GPS projection needed since
        // it was never real-world-anchored to begin with).
        var isLargeField = parent is null && request.GeoVertices is { Count: >= 3 };
        var isSmallField = parent is null && !isLargeField && request.PlantSpacing is null
            && request.Vertices is { Count: >= 3 };

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
        else if (isSmallField)
        {
            field = new Field
            {
                ProjectId = projectId,
                Name = request.Name,
                Variety = null,
                ShapeType = "polygon",
                SowingStructure = "grid",
                VerticesJson = JsonSerializer.Serialize(request.Vertices),
                GeoVerticesJson = null,
                OriginLat = null,
                OriginLng = null,
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

            // A sub-field of a map-anchored large field is drawn in GPS and
            // projected through the parent's origin; a sub-field of a small
            // field (no map, ever) is drawn directly in the parent's own
            // local-meter space, so it needs no projection at all.
            var isMapAnchored = parent.OriginLat is not null && parent.OriginLng is not null;
            var vertices = isMapAnchored
                ? ProjectAndValidateWithinParent(request.GeoVertices, parent)
                : ValidateVerticesWithinParent(request.Vertices, parent);

            field = new Field
            {
                ProjectId = projectId,
                ParentFieldId = parent.Id,
                Name = request.Name,
                Variety = request.Variety,
                ShapeType = "polygon",
                SowingStructure = request.SowingStructure == "staggered" ? "staggered" : "grid",
                VerticesJson = JsonSerializer.Serialize(vertices),
                GeoVerticesJson = isMapAnchored ? JsonSerializer.Serialize(request.GeoVertices) : null,
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

    public async Task<FieldDto?> UpdateGeometryAsync(string projectId, int fieldId, UpdateFieldGeometryRequest request)
    {
        var field = await _db.Fields.FirstOrDefaultAsync(f => f.Id == fieldId && f.ProjectId == projectId);
        if (field is null)
        {
            return null;
        }

        if (field.ParentFieldId is not { } parentId)
        {
            // A top-level container's own boundary. Only a genuine Small
            // Field container qualifies - a Large Field's boundary is
            // GPS-anchored and still draw-once (unlike its sub-fields, which
            // project through that anchor), and a legacy standalone field
            // (map-less but with its own PlantSpacing, predating the
            // container model) isn't a container at all. A Small Field has
            // nothing to anchor to, so reshaping it is just a local
            // containment check against whatever sub-fields it already has -
            // unlike moving a sub-field, there's no parent to stay inside.
            var isSmallFieldContainer = field.OriginLat is null && field.OriginLng is null && field.PlantSpacing is null;
            if (!isSmallFieldContainer)
            {
                throw new ArgumentException("Only sub-fields can be repositioned this way.");
            }

            var newBoundary = ValidateTopLevelVertices(request.Vertices);
            var children = await _db.Fields
                .Where(f => f.ParentFieldId == field.Id)
                .ToListAsync();
            foreach (var child in children)
            {
                var childVertices = JsonSerializer.Deserialize<List<VertexDto>>(child.VerticesJson) ?? new();
                if (childVertices.Any(v => !PolygonMath.IsInside(v.X, v.Y, newBoundary)))
                {
                    throw new ArgumentException("Resizing would leave an existing sub-field outside this boundary.");
                }
            }

            field.VerticesJson = JsonSerializer.Serialize(newBoundary);
            await _db.SaveChangesAsync();
            return ToDto(field);
        }

        var parent = await _db.Fields.FirstOrDefaultAsync(f => f.Id == parentId && f.ProjectId == projectId);
        if (parent is null)
        {
            throw new ArgumentException("Parent field not found.");
        }

        // Same split as CreateAsync: a map-anchored parent's sub-field is
        // drawn in GPS and projected through the parent's origin; a map-less
        // parent's sub-field is already in the parent's own local-meter
        // space, so it needs no projection at all.
        var isMapAnchored = parent.OriginLat is not null && parent.OriginLng is not null;
        var vertices = isMapAnchored
            ? ProjectAndValidateWithinParent(request.GeoVertices, parent)
            : ValidateVerticesWithinParent(request.Vertices, parent);

        field.VerticesJson = JsonSerializer.Serialize(vertices);
        field.GeoVerticesJson = isMapAnchored ? JsonSerializer.Serialize(request.GeoVertices) : null;
        await _db.SaveChangesAsync();

        return ToDto(field);
    }

    // Unlike UpdatePropertiesAsync (planting data only a non-container field
    // has), a name applies to every field - container or not - so this is
    // the only edit a large/small field's own boundary row supports.
    public async Task<FieldDto?> RenameAsync(string projectId, int fieldId, string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name cannot be empty.");
        }

        var field = await _db.Fields.FirstOrDefaultAsync(f => f.Id == fieldId && f.ProjectId == projectId);
        if (field is null)
        {
            return null;
        }

        field.Name = name;
        await _db.SaveChangesAsync();
        return ToDto(field);
    }

    public async Task<FieldDto?> UpdatePropertiesAsync(string projectId, int fieldId, UpdateFieldPropertiesRequest request)
    {
        var field = await _db.Fields.FirstOrDefaultAsync(f => f.Id == fieldId && f.ProjectId == projectId);
        if (field is null)
        {
            return null;
        }

        // A large-field container carries no planting data of its own -
        // only its sub-fields do (see CreateAsync) - so it has nothing here
        // to update.
        if (field.ParentFieldId is null && field.PlantSpacing is null)
        {
            throw new ArgumentException("Large field containers have no planting properties to update.");
        }

        ValidateSpacing(request.PlantSpacing, request.RowSpacing);

        field.Name = request.Name;
        field.Variety = request.Variety;
        field.SowingStructure = request.SowingStructure == "staggered" ? "staggered" : "grid";
        field.PlantSpacing = request.PlantSpacing;
        field.RowSpacing = request.RowSpacing;
        field.Status = request.Status is { } status && ValidStatuses.Contains(status) ? status : "planning";
        field.SowingDate = request.SowingDate;
        field.HarvestDate = request.HarvestDate;
        field.YieldAmount = request.YieldAmount;
        field.YieldUnit = request.YieldUnit;
        field.Notes = request.Notes;
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
        return ValidateWithinParent(vertices, parent);
    }

    // A small field's sub-field is drawn directly in the parent's own local
    // space (see FieldDrawingCanvas's referenceVertices mode client-side), so
    // there's no GPS origin to project through - just the containment check.
    private static List<VertexDto> ValidateVerticesWithinParent(List<VertexDto>? vertices, Field parent)
    {
        if (vertices is not { Count: >= 3 })
        {
            throw new ArgumentException("A sub-field needs a boundary with at least 3 points.");
        }

        return ValidateWithinParent(vertices, parent);
    }

    // A top-level container has no parent of its own to stay inside - the
    // only requirement is a valid boundary. Whether it can still legally
    // contain its existing sub-fields is checked separately by the caller.
    private static List<VertexDto> ValidateTopLevelVertices(List<VertexDto>? vertices)
    {
        if (vertices is not { Count: >= 3 })
        {
            throw new ArgumentException("A field needs a boundary with at least 3 points.");
        }

        return vertices;
    }

    private static List<VertexDto> ValidateWithinParent(List<VertexDto> vertices, Field parent)
    {
        var parentVertices = JsonSerializer.Deserialize<List<VertexDto>>(parent.VerticesJson) ?? new List<VertexDto>();
        if (vertices.Any(v => !PolygonMath.IsInside(v.X, v.Y, parentVertices)))
        {
            throw new ArgumentException("Sub-field must stay within the parent field's boundary.");
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
            Status = field.Status ?? "planning",
            SowingDate = field.SowingDate,
            HarvestDate = field.HarvestDate,
            YieldAmount = field.YieldAmount,
            YieldUnit = field.YieldUnit,
            Notes = field.Notes,
        };
    }
}
