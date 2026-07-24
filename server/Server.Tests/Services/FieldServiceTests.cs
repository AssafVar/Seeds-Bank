using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class FieldServiceTests
{
    private static FieldRequest MakeRectangleRequest(string name = "North plot") => new()
    {
        Name = name,
        ShapeType = "rectangle",
        LandWidth = 4,
        LandLength = 4,
        PlantSpacing = 2,
        RowSpacing = 2,
    };

    private static List<GeoVertexDto> LargeFieldBoundary() => new()
    {
        new() { Lat = 0, Lng = 0 },
        new() { Lat = 0, Lng = 0.001 },
        new() { Lat = 0.001, Lng = 0.001 },
        new() { Lat = 0.001, Lng = 0 },
    };

    private static List<GeoVertexDto> SubFieldBoundaryInsideLargeField() => new()
    {
        new() { Lat = 0.0002, Lng = 0.0002 },
        new() { Lat = 0.0002, Lng = 0.0008 },
        new() { Lat = 0.0008, Lng = 0.0008 },
        new() { Lat = 0.0008, Lng = 0.0002 },
    };

    private static List<GeoVertexDto> BoundaryFarOutsideLargeField() => new()
    {
        new() { Lat = 10, Lng = 10 },
        new() { Lat = 10, Lng = 10.001 },
        new() { Lat = 10.001, Lng = 10.001 },
        new() { Lat = 10.001, Lng = 10 },
    };

    [Fact]
    public async Task CreateAsync_builds_a_rectangle_with_the_expected_area_and_capacity()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);

        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        Assert.Equal(16, field.Area);
        // 4m wide / 2m spacing -> 3 columns (0,2,4); same for rows -> 3x3 = 9
        Assert.Equal(9, field.TotalCapacity);
        Assert.Equal(3, field.PlantsPerRow);
        Assert.Equal(3, field.NumberOfRows);
        Assert.Equal("planning", field.Status);
    }

    [Fact]
    public async Task CreateAsync_rejects_a_rectangle_missing_land_dimensions()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var request = MakeRectangleRequest();
        request.LandWidth = null;

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("p1", request));
    }

    [Fact]
    public async Task CreateAsync_rejects_non_positive_spacing()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var request = MakeRectangleRequest();
        request.PlantSpacing = 0;

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("p1", request));
    }

    [Fact]
    public async Task CreateAsync_rejects_a_polygon_with_fewer_than_three_vertices()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var request = MakeRectangleRequest();
        request.ShapeType = "polygon";
        request.Vertices = new List<VertexDto> { new() { X = 0, Y = 0 }, new() { X = 1, Y = 1 } };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("p1", request));
    }

    [Fact]
    public async Task CreateAsync_builds_a_large_field_container_with_no_planting_data()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);

        var field = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });

        Assert.Null(field.PlantSpacing);
        Assert.Equal(0, field.TotalCapacity);
        Assert.Null(field.ParentFieldId);
        Assert.NotNull(field.GeoVertices);
    }

    [Fact]
    public async Task CreateAsync_carves_a_sub_field_inside_its_parent_s_boundary()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var largeField = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });

        var subField = await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = largeField.Id,
            GeoVertices = SubFieldBoundaryInsideLargeField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        Assert.Equal(largeField.Id, subField.ParentFieldId);
        Assert.True(subField.TotalCapacity > 0);
    }

    [Fact]
    public async Task CreateAsync_rejects_a_sub_field_boundary_outside_its_parent()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var largeField = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot B",
            ShapeType = "polygon",
            ParentFieldId = largeField.Id,
            GeoVertices = BoundaryFarOutsideLargeField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        }));
    }

    [Fact]
    public async Task CreateAsync_rejects_nesting_a_sub_field_under_another_sub_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var largeField = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });
        var subField = await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = largeField.Id,
            GeoVertices = SubFieldBoundaryInsideLargeField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("p1", new FieldRequest
        {
            Name = "Grandchild",
            ShapeType = "polygon",
            ParentFieldId = subField.Id,
            GeoVertices = SubFieldBoundaryInsideLargeField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        }));
    }

    [Fact]
    public async Task UpdateGeometryAsync_repositions_a_sub_field_within_its_parent()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var largeField = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });
        var subField = await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = largeField.Id,
            GeoVertices = SubFieldBoundaryInsideLargeField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        var moved = await service.UpdateGeometryAsync("p1", subField.Id, new UpdateFieldGeometryRequest { GeoVertices = SubFieldBoundaryInsideLargeField() });

        Assert.NotNull(moved);
    }

    [Fact]
    public async Task UpdateGeometryAsync_throws_for_a_field_that_is_not_a_sub_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateGeometryAsync("p1", field.Id, new UpdateFieldGeometryRequest { GeoVertices = SubFieldBoundaryInsideLargeField() }));
    }

    [Fact]
    public async Task UpdateGeometryAsync_returns_null_for_a_missing_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);

        Assert.Null(await service.UpdateGeometryAsync("p1", 999, new UpdateFieldGeometryRequest { GeoVertices = SubFieldBoundaryInsideLargeField() }));
    }

    [Fact]
    public async Task UpdateGeometryAsync_repositions_a_no_map_sub_field_within_its_small_field_parent()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });
        var subField = await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = smallField.Id,
            Vertices = SubFieldBoundaryInsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        var moved = await service.UpdateGeometryAsync("p1", subField.Id, new UpdateFieldGeometryRequest { Vertices = SubFieldBoundaryInsideSmallField() });

        Assert.NotNull(moved);
        Assert.Null(moved!.GeoVertices);
    }

    [Fact]
    public async Task UpdateGeometryAsync_rejects_a_no_map_sub_field_move_outside_its_small_field_parent()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });
        var subField = await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = smallField.Id,
            Vertices = SubFieldBoundaryInsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateGeometryAsync("p1", subField.Id, new UpdateFieldGeometryRequest { Vertices = BoundaryFarOutsideSmallField() }));
    }

    [Fact]
    public async Task UpdatePropertiesAsync_updates_a_standalone_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        var updated = await service.UpdatePropertiesAsync("p1", field.Id, new UpdateFieldPropertiesRequest
        {
            Name = "Renamed plot",
            PlantSpacing = 1,
            RowSpacing = 1,
            Status = "growing",
        });

        Assert.NotNull(updated);
        Assert.Equal("Renamed plot", updated!.Name);
        Assert.Equal("growing", updated.Status);
    }

    [Fact]
    public async Task UpdatePropertiesAsync_falls_back_to_planning_for_an_invalid_status()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        var updated = await service.UpdatePropertiesAsync("p1", field.Id, new UpdateFieldPropertiesRequest
        {
            Name = "Renamed plot",
            PlantSpacing = 1,
            RowSpacing = 1,
            Status = "not-a-real-status",
        });

        Assert.Equal("planning", updated!.Status);
    }

    [Fact]
    public async Task UpdatePropertiesAsync_throws_for_a_large_field_container()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var largeField = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdatePropertiesAsync("p1", largeField.Id, new UpdateFieldPropertiesRequest { Name = "x", PlantSpacing = 1, RowSpacing = 1 }));
    }

    [Fact]
    public async Task DeleteAsync_removes_the_field_and_returns_true()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        Assert.True(await service.DeleteAsync("p1", field.Id));
        Assert.Empty(await service.GetByProjectAsync("p1"));
    }

    [Fact]
    public async Task DeleteAsync_returns_false_for_a_missing_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);

        Assert.False(await service.DeleteAsync("p1", 999));
    }

    private static List<VertexDto> SmallFieldBoundary() => new()
    {
        new() { X = 0, Y = 0 },
        new() { X = 10, Y = 0 },
        new() { X = 10, Y = 10 },
        new() { X = 0, Y = 10 },
    };

    private static List<VertexDto> SubFieldBoundaryInsideSmallField() => new()
    {
        new() { X = 2, Y = 2 },
        new() { X = 4, Y = 2 },
        new() { X = 4, Y = 4 },
        new() { X = 2, Y = 4 },
    };

    private static List<VertexDto> BoundaryFarOutsideSmallField() => new()
    {
        new() { X = 100, Y = 100 },
        new() { X = 110, Y = 100 },
        new() { X = 110, Y = 110 },
        new() { X = 100, Y = 110 },
    };

    [Fact]
    public async Task CreateAsync_builds_a_small_field_container_with_no_planting_data_and_no_map_anchor()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);

        var field = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });

        Assert.Null(field.PlantSpacing);
        Assert.Equal(0, field.TotalCapacity);
        Assert.Null(field.ParentFieldId);
        Assert.Null(field.GeoVertices);
        Assert.Equal(100, field.Area);
    }

    [Fact]
    public async Task CreateAsync_carves_a_no_map_sub_field_inside_a_small_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });

        var subField = await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = smallField.Id,
            Vertices = SubFieldBoundaryInsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        Assert.Equal(smallField.Id, subField.ParentFieldId);
        Assert.Null(subField.GeoVertices);
        Assert.True(subField.TotalCapacity > 0);
    }

    [Fact]
    public async Task CreateAsync_rejects_a_no_map_sub_field_boundary_outside_its_small_field_parent()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot B",
            ShapeType = "polygon",
            ParentFieldId = smallField.Id,
            Vertices = BoundaryFarOutsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        }));
    }

    [Fact]
    public async Task CreateAsync_rejects_a_vertices_only_sub_field_under_a_map_anchored_large_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var largeField = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });

        // The parent is GPS-anchored, so a sub-field must supply GeoVertices -
        // a local-only Vertices payload should still be rejected, not silently
        // treated as though it were map-less.
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot C",
            ShapeType = "polygon",
            ParentFieldId = largeField.Id,
            Vertices = SubFieldBoundaryInsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        }));
    }

    [Fact]
    public async Task GetByProjectAsync_only_returns_fields_for_the_given_project()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        await service.CreateAsync("p1", MakeRectangleRequest());
        await service.CreateAsync("p2", MakeRectangleRequest("Other project's field"));

        var fields = await service.GetByProjectAsync("p1");

        Assert.Single(fields);
    }
}
