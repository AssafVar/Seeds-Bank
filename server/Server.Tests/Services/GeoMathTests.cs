using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class GeoMathTests
{
    [Fact]
    public void Project_maps_the_origin_point_itself_to_zero_zero()
    {
        var vertex = GeoMath.Project(new GeoVertexDto { Lat = 40.0, Lng = -74.0 }, originLat: 40.0, originLng: -74.0);

        Assert.Equal(0, vertex.X, precision: 6);
        Assert.Equal(0, vertex.Y, precision: 6);
    }

    [Fact]
    public void Project_moves_a_point_north_of_the_origin_to_positive_y()
    {
        var vertex = GeoMath.Project(new GeoVertexDto { Lat = 40.001, Lng = -74.0 }, originLat: 40.0, originLng: -74.0);

        Assert.True(vertex.Y > 0);
        Assert.Equal(0, vertex.X, precision: 6);
    }

    [Fact]
    public void Centroid_averages_a_set_of_points()
    {
        var points = new List<GeoVertexDto>
        {
            new() { Lat = 0, Lng = 0 },
            new() { Lat = 0, Lng = 0.002 },
            new() { Lat = 0.002, Lng = 0.002 },
            new() { Lat = 0.002, Lng = 0 },
        };

        var (lat, lng) = GeoMath.Centroid(points);

        Assert.Equal(0.001, lat, precision: 6);
        Assert.Equal(0.001, lng, precision: 6);
    }
}
