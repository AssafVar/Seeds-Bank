using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class PolygonMathTests
{
    private static List<VertexDto> Square(double side) => new()
    {
        new() { X = 0, Y = 0 },
        new() { X = side, Y = 0 },
        new() { X = side, Y = side },
        new() { X = 0, Y = side },
    };

    [Fact]
    public void Area_computes_the_area_of_a_simple_rectangle()
    {
        var area = PolygonMath.Area(Square(10));

        Assert.Equal(100, area);
    }

    [Fact]
    public void IsInside_returns_true_for_a_point_inside_and_false_for_one_outside()
    {
        var square = Square(10);

        Assert.True(PolygonMath.IsInside(5, 5, square));
        Assert.False(PolygonMath.IsInside(15, 15, square));
    }

    [Fact]
    public void IsInside_treats_a_point_exactly_on_an_edge_as_inside()
    {
        var square = Square(10);

        Assert.True(PolygonMath.IsInside(0, 5, square));
    }

    [Fact]
    public void ComputePlantPositions_fills_a_grid_at_the_given_spacing()
    {
        var positions = PolygonMath.ComputePlantPositions(Square(4), plantSpacing: 2, rowSpacing: 2, sowingStructure: "grid");

        // x in {0,2,4}, y in {0,2,4} -> 3x3 grid
        Assert.Equal(9, positions.Count);
    }

    [Fact]
    public void ComputePlantPositions_staggered_offsets_every_other_row()
    {
        var grid = PolygonMath.ComputePlantPositions(Square(4), plantSpacing: 2, rowSpacing: 2, sowingStructure: "grid");
        var staggered = PolygonMath.ComputePlantPositions(Square(4), plantSpacing: 2, rowSpacing: 2, sowingStructure: "staggered");

        // The offset in a staggered second row can push its last column
        // outside the boundary, so staggered never yields more points than
        // the aligned grid for the same shape/spacing.
        Assert.True(staggered.Count <= grid.Count);
        Assert.NotEqual(grid, staggered);
    }

    [Fact]
    public void ComputeThinnedPositions_reduces_the_point_count_toward_the_target()
    {
        var vertices = Square(100);
        var actual = PolygonMath.ComputePlantPositions(vertices, plantSpacing: 1, rowSpacing: 1, sowingStructure: "grid");

        var thinned = PolygonMath.ComputeThinnedPositions(vertices, plantSpacing: 1, rowSpacing: 1, sowingStructure: "grid", actualCount: actual.Count, targetCount: 100);

        Assert.True(thinned.Count < actual.Count);
    }
}
