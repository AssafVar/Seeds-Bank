using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

// Converts real-world lat/lng into local planar meters (and back) via an
// equirectangular tangent-plane projection anchored at an origin point.
// Accurate enough at the few-km field scale this app targets - it lets a
// GPS-drawn boundary feed straight into the existing meter-based
// PolygonMath (area/point-in-polygon/plant-position) without touching that
// code at all.
public static class GeoMath
{
    private const double EarthRadiusMeters = 6371000;

    public static VertexDto Project(GeoVertexDto point, double originLat, double originLng)
    {
        var x = (point.Lng - originLng) * (Math.PI / 180) * EarthRadiusMeters * Math.Cos(originLat * Math.PI / 180);
        var y = (point.Lat - originLat) * (Math.PI / 180) * EarthRadiusMeters;
        return new VertexDto { X = x, Y = y };
    }

    public static List<VertexDto> Project(IEnumerable<GeoVertexDto> points, double originLat, double originLng)
    {
        return points.Select(p => Project(p, originLat, originLng)).ToList();
    }

    public static (double Lat, double Lng) Centroid(IReadOnlyList<GeoVertexDto> points)
    {
        return (points.Average(p => p.Lat), points.Average(p => p.Lng));
    }
}
