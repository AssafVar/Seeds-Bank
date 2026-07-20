using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

// Pure geometry helpers shared by rectangle- and polygon-shaped fields.
// A rectangle is just its own 4-corner polygon (see FieldService), so one
// set of formulas here handles both.
public static class PolygonMath
{
    private const double Epsilon = 1e-9;

    public static double Area(IReadOnlyList<VertexDto> vertices)
    {
        double sum = 0;
        var n = vertices.Count;
        for (var i = 0; i < n; i++)
        {
            var a = vertices[i];
            var b = vertices[(i + 1) % n];
            sum += a.X * b.Y - b.X * a.Y;
        }

        return Math.Abs(sum) / 2.0;
    }

    public static (double MinX, double MaxX, double MinY, double MaxY) BoundingBox(IReadOnlyList<VertexDto> vertices)
    {
        return (
            vertices.Min(v => v.X),
            vertices.Max(v => v.X),
            vertices.Min(v => v.Y),
            vertices.Max(v => v.Y)
        );
    }

    // Ray-casting test, with an explicit boundary check first so that
    // points sitting exactly on an edge - e.g. every point along a
    // rectangle's own sides, which is where a lot of our grid points
    // naturally land - are reliably counted as inside rather than being
    // left to floating-point-sensitive ray-casting behavior.
    public static bool IsInside(double px, double py, IReadOnlyList<VertexDto> vertices)
    {
        var n = vertices.Count;

        for (var i = 0; i < n; i++)
        {
            var a = vertices[i];
            var b = vertices[(i + 1) % n];
            if (IsOnSegment(px, py, a, b))
            {
                return true;
            }
        }

        var inside = false;
        for (int i = 0, j = n - 1; i < n; j = i++)
        {
            var xi = vertices[i].X;
            var yi = vertices[i].Y;
            var xj = vertices[j].X;
            var yj = vertices[j].Y;
            var intersects = (yi > py) != (yj > py) &&
                px < (xj - xi) * (py - yi) / (yj - yi) + xi;
            if (intersects)
            {
                inside = !inside;
            }
        }

        return inside;
    }

    public static List<VertexDto> ComputePlantPositions(
        IReadOnlyList<VertexDto> vertices, double plantSpacing, double rowSpacing, string sowingStructure)
    {
        var (minX, maxX, minY, maxY) = BoundingBox(vertices);
        var positions = new List<VertexDto>();
        var isStaggered = sowingStructure == "staggered";

        var rowIndex = 0;
        for (var y = minY; y <= maxY + Epsilon; y += rowSpacing, rowIndex++)
        {
            // Staggered/triangular pattern: every other row is shifted by
            // half the in-row spacing, so plants nestle into the gaps of
            // the row before them instead of lining up in straight columns.
            var xOffset = isStaggered && rowIndex % 2 == 1 ? plantSpacing / 2.0 : 0;
            for (var x = minX + xOffset; x <= maxX + Epsilon; x += plantSpacing)
            {
                if (IsInside(x, y, vertices))
                {
                    positions.Add(new VertexDto { X = x, Y = y });
                }
            }
        }

        return positions;
    }

    private static bool IsOnSegment(double px, double py, VertexDto a, VertexDto b)
    {
        var cross = (b.X - a.X) * (py - a.Y) - (b.Y - a.Y) * (px - a.X);
        if (Math.Abs(cross) > Epsilon)
        {
            return false;
        }

        var minX = Math.Min(a.X, b.X) - Epsilon;
        var maxX = Math.Max(a.X, b.X) + Epsilon;
        var minY = Math.Min(a.Y, b.Y) - Epsilon;
        var maxY = Math.Max(a.Y, b.Y) + Epsilon;
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }
}
