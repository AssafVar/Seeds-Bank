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
    public async Task UpdateGeometryAsync_reshapes_a_small_field_container_with_no_sub_fields()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });

        var reshaped = await service.UpdateGeometryAsync("p1", smallField.Id, new UpdateFieldGeometryRequest
        {
            Vertices = new List<VertexDto>
            {
                new() { X = 0, Y = 0 },
                new() { X = 20, Y = 0 },
                new() { X = 20, Y = 20 },
                new() { X = 0, Y = 20 },
            },
        });

        Assert.NotNull(reshaped);
        Assert.Equal(400, reshaped!.Area);
    }

    [Fact]
    public async Task UpdateGeometryAsync_reshapes_a_small_field_container_that_still_fits_its_sub_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });
        await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = smallField.Id,
            Vertices = SubFieldBoundaryInsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        // Growing the boundary keeps the existing sub-field (x/y 2..4) well inside it.
        var reshaped = await service.UpdateGeometryAsync("p1", smallField.Id, new UpdateFieldGeometryRequest
        {
            Vertices = new List<VertexDto>
            {
                new() { X = 0, Y = 0 },
                new() { X = 20, Y = 0 },
                new() { X = 20, Y = 20 },
                new() { X = 0, Y = 20 },
            },
        });

        Assert.NotNull(reshaped);
    }

    [Fact]
    public async Task UpdateGeometryAsync_rejects_shrinking_a_small_field_container_past_an_existing_sub_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });
        await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = smallField.Id,
            Vertices = SubFieldBoundaryInsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        // Shrunk to x/y 0..3, which cuts off the sub-field's x/y 2..4 corner.
        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateGeometryAsync("p1", smallField.Id, new UpdateFieldGeometryRequest
        {
            Vertices = new List<VertexDto>
            {
                new() { X = 0, Y = 0 },
                new() { X = 3, Y = 0 },
                new() { X = 3, Y = 3 },
                new() { X = 0, Y = 3 },
            },
        }));
    }

    [Fact]
    public async Task UpdateGeometryAsync_throws_for_a_standalone_field_with_its_own_planting_data()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        // A legacy standalone field (map-less, no parent, but its own
        // PlantSpacing) predates the container model and isn't one - it
        // must not be treated as a reshapable Small Field container.
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateGeometryAsync("p1", field.Id, new UpdateFieldGeometryRequest { Vertices = SmallFieldBoundary() }));
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
    public async Task RenameAsync_renames_a_large_field_container_which_UpdatePropertiesAsync_rejects()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var largeField = await service.CreateAsync("p1", new FieldRequest { Name = "Big block", ShapeType = "polygon", GeoVertices = LargeFieldBoundary() });

        var renamed = await service.RenameAsync("p1", largeField.Id, "North block");

        Assert.Equal("North block", renamed!.Name);
    }

    [Fact]
    public async Task RenameAsync_renames_a_regular_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        var renamed = await service.RenameAsync("p1", field.Id, "Renamed plot");

        Assert.Equal("Renamed plot", renamed!.Name);
    }

    [Fact]
    public async Task RenameAsync_rejects_a_blank_name()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        await Assert.ThrowsAsync<ArgumentException>(() => service.RenameAsync("p1", field.Id, "   "));
    }

    [Fact]
    public async Task RenameAsync_returns_null_for_a_missing_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);

        Assert.Null(await service.RenameAsync("p1", 999, "x"));
    }

    [Fact]
    public async Task DeleteAsync_removes_the_field_and_returns_true()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var field = await service.CreateAsync("p1", MakeRectangleRequest());

        Assert.True(await service.DeleteAsync("p1", field.Id));
        Assert.Empty((await service.GetByProjectAsync("p1", 1, 12)).Items);
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

        var result = await service.GetByProjectAsync("p1", 1, 12);

        Assert.Single(result.Items);
        Assert.Equal(1, result.TotalCount);
    }

    [Fact]
    public async Task GetByProjectAsync_paginates_top_level_fields_and_reports_total_count()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        for (var i = 0; i < 5; i++)
        {
            await service.CreateAsync("p1", MakeRectangleRequest($"Field {i}"));
        }

        var page1 = await service.GetByProjectAsync("p1", 1, 2);
        var page2 = await service.GetByProjectAsync("p1", 2, 2);
        var page3 = await service.GetByProjectAsync("p1", 3, 2);

        Assert.Equal(5, page1.TotalCount);
        Assert.Equal(3, page1.TotalPages);
        Assert.Equal(2, page1.Items.Count);
        Assert.Equal(2, page2.Items.Count);
        Assert.Single(page3.Items);
        // Newest-first ordering, and no overlap between pages.
        Assert.Empty(page1.Items.Select(f => f.Id).Intersect(page2.Items.Select(f => f.Id)));
    }

    [Fact]
    public async Task GetByProjectAsync_includes_sub_fields_of_the_current_page_without_counting_them_as_top_level()
    {
        using var db = TestDbContextFactory.Create();
        var service = new FieldService(db);
        var smallField = await service.CreateAsync("p1", new FieldRequest { Name = "Backyard block", ShapeType = "polygon", Vertices = SmallFieldBoundary() });
        await service.CreateAsync("p1", new FieldRequest
        {
            Name = "Sub plot A",
            ShapeType = "polygon",
            ParentFieldId = smallField.Id,
            Vertices = SubFieldBoundaryInsideSmallField(),
            PlantSpacing = 0.5,
            RowSpacing = 0.5,
        });

        var result = await service.GetByProjectAsync("p1", 1, 12);

        Assert.Equal(1, result.TotalCount); // only the container counts as top-level
        Assert.Equal(2, result.Items.Count); // container + its sub-field both come back
    }
}
