using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Controllers;

// Status codes and answer shapes of the plants, lines and populations
// controllers over mocked services. (Ownership and routes: RouteSweepTests.)
public class PedigreeControllersTests
{
    private static (PlantsController C, Mock<IPlantService> S) Plants(bool owns = true)
    {
        var projects = new Mock<IProjectsService>();
        projects.Setup(p => p.IsProjectOwnedAsync("u1", "p1")).ReturnsAsync(owns);
        var service = new Mock<IPlantService>();
        var controller = new PlantsController(service.Object, projects.Object);
        ControllerTestHelpers.SetUser(controller, "u1");
        return (controller, service);
    }

    private static (LinesController C, Mock<ILineService> S) Lines()
    {
        var projects = new Mock<IProjectsService>();
        projects.Setup(p => p.IsProjectOwnedAsync("u1", "p1")).ReturnsAsync(true);
        var service = new Mock<ILineService>();
        var controller = new LinesController(service.Object, projects.Object);
        ControllerTestHelpers.SetUser(controller, "u1");
        return (controller, service);
    }

    private static (PopulationsController C, Mock<ILineService> S) Populations()
    {
        var projects = new Mock<IProjectsService>();
        projects.Setup(p => p.IsProjectOwnedAsync("u1", "p1")).ReturnsAsync(true);
        var service = new Mock<ILineService>();
        var controller = new PopulationsController(service.Object, projects.Object);
        ControllerTestHelpers.SetUser(controller, "u1");
        return (controller, service);
    }

    private static object Prop(object? value, string name) => value!.GetType().GetProperty(name)!.GetValue(value)!;

    // ---- plants ----

    [Fact]
    public async Task GetPlants_returns_200_with_the_page()
    {
        var (c, s) = Plants();
        var page = new PagedResultDto<PlantDto> { Page = 1, PageSize = 25, TotalCount = 0 };
        s.Setup(x => x.GetPlantsAsync("p1", It.IsAny<PlantListQuery>())).ReturnsAsync(page);

        var result = await c.GetPlants("u1", "p1", new PlantListQuery());

        Assert.Same(page, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task GetPlants_maps_a_rule_error_to_400_with_message_field_code()
    {
        var (c, s) = Plants();
        s.Setup(x => x.GetPlantsAsync("p1", It.IsAny<PlantListQuery>()))
            .ThrowsAsync(new PedigreeException("q", PedigreeCodes.QueryTooLong, "The search text is too long."));

        var result = Assert.IsType<ObjectResult>(await c.GetPlants("u1", "p1", new PlantListQuery { Q = "x" }));

        Assert.Equal(400, result.StatusCode);
        Assert.Equal("The search text is too long.", Prop(result.Value, "message"));
        Assert.Equal("q", Prop(result.Value, "field"));
        Assert.Equal("query_too_long", Prop(result.Value, "code"));
    }

    [Fact]
    public async Task GetCounts_and_Preview_return_200()
    {
        var (c, s) = Plants();
        s.Setup(x => x.GetCountsAsync("p1", It.IsAny<PlantCountsQuery>())).ReturnsAsync(new PlantCountsDto());
        s.Setup(x => x.PreviewAsync("p1", It.IsAny<PlacementPreviewQuery>())).ReturnsAsync(new PlacementPreviewDto());

        Assert.IsType<OkObjectResult>(await c.GetCounts("u1", "p1", new PlantCountsQuery()));
        Assert.IsType<OkObjectResult>(await c.Preview("u1", "p1", new PlacementPreviewQuery()));
    }

    [Fact]
    public async Task GetPlant_returns_200_or_404()
    {
        var (c, s) = Plants();
        s.Setup(x => x.GetPlantAsync("p1", "a")).ReturnsAsync(new PlantDto { PlantId = "a" });
        s.Setup(x => x.GetPlantAsync("p1", "missing")).ReturnsAsync((PlantDto?)null);

        Assert.IsType<OkObjectResult>(await c.GetPlant("u1", "p1", "a"));
        Assert.IsType<NotFoundResult>(await c.GetPlant("u1", "p1", "missing"));
    }

    [Fact]
    public async Task CreatePlants_returns_201_with_plants_and_line()
    {
        var (c, s) = Plants();
        var response = new CreatePlantsResponse { Plants = { new PlantDto { Tag = "P-001" } }, Line = new LineDto { Id = 1 } };
        s.Setup(x => x.CreateAsync("p1", It.IsAny<CreatePlantsRequest>())).ReturnsAsync(response);

        var result = Assert.IsType<ObjectResult>(await c.CreatePlants("u1", "p1", new CreatePlantsRequest()));

        Assert.Equal(201, result.StatusCode);
        Assert.Same(response, result.Value);
    }

    [Theory]
    [InlineData(400, "parent_not_found", "mother")]
    [InlineData(409, "tag_taken", "tag")]
    [InlineData(409, "line_name_taken", "lineName")]
    public async Task CreatePlants_maps_rule_errors(int status, string code, string field)
    {
        var (c, s) = Plants();
        s.Setup(x => x.CreateAsync("p1", It.IsAny<CreatePlantsRequest>())).ThrowsAsync(new PedigreeException(field, code, "message", status));

        var result = Assert.IsType<ObjectResult>(await c.CreatePlants("u1", "p1", new CreatePlantsRequest()));

        Assert.Equal(status, result.StatusCode);
        Assert.Equal(code, Prop(result.Value, "code"));
        Assert.Equal(field, Prop(result.Value, "field"));
    }

    [Fact]
    public async Task UpdateTraits_returns_200_404_and_409()
    {
        var (c, s) = Plants();
        s.Setup(x => x.UpdateTraitsAsync("p1", "a", It.IsAny<UpdatePlantRequest>())).ReturnsAsync(new PlantDto { PlantId = "a" });
        s.Setup(x => x.UpdateTraitsAsync("p1", "gone", It.IsAny<UpdatePlantRequest>())).ReturnsAsync((PlantDto?)null);
        s.Setup(x => x.UpdateTraitsAsync("p1", "stale", It.IsAny<UpdatePlantRequest>()))
            .ThrowsAsync(PedigreeException.Conflict(null, PedigreeCodes.VersionConflict, "This plant was changed elsewhere. Reload to see the latest."));

        Assert.IsType<OkObjectResult>(await c.UpdateTraits("u1", "p1", "a", new UpdatePlantRequest()));
        Assert.IsType<NotFoundResult>(await c.UpdateTraits("u1", "p1", "gone", new UpdatePlantRequest()));
        var conflict = Assert.IsType<ObjectResult>(await c.UpdateTraits("u1", "p1", "stale", new UpdatePlantRequest()));
        Assert.Equal(409, conflict.StatusCode);
        Assert.Equal("This plant was changed elsewhere. Reload to see the latest.", Prop(conflict.Value, "message"));
    }

    [Fact]
    public async Task UpdateParents_returns_200_with_the_previous_values_or_404()
    {
        var (c, s) = Plants();
        var response = new UpdateParentsResponse { Plant = new PlantDto(), PreviousLabel = "F1", PreviousMotherPlantId = "m", PreviousFatherPlantId = "f", Line = new LineDto() };
        s.Setup(x => x.UpdateParentsAsync("p1", "a", It.IsAny<UpdateParentsRequest>())).ReturnsAsync(response);
        s.Setup(x => x.UpdateParentsAsync("p1", "gone", It.IsAny<UpdateParentsRequest>())).ReturnsAsync((UpdateParentsResponse?)null);

        Assert.Same(response, Assert.IsType<OkObjectResult>(await c.UpdateParents("u1", "p1", "a", new UpdateParentsRequest())).Value);
        Assert.IsType<NotFoundResult>(await c.UpdateParents("u1", "p1", "gone", new UpdateParentsRequest()));
    }

    [Fact]
    public async Task DeletePlant_returns_200_with_childrenAffected()
    {
        var (c, s) = Plants();
        s.Setup(x => x.DeleteAsync("p1", "plant-1", true)).ReturnsAsync(new DeletePlantResult(DeletePlantStatus.Deleted, 3));

        var result = Assert.IsType<OkObjectResult>(await c.DeletePlant("u1", "p1", "plant-1", confirm: true));

        Assert.Equal(3, Assert.IsType<DeletePlantResponse>(result.Value).ChildrenAffected);
    }

    [Fact]
    public async Task DeletePlant_returns_409_has_children_with_the_count_and_does_not_delete()
    {
        var (c, s) = Plants();
        s.Setup(x => x.DeleteAsync("p1", "plant-1", false)).ReturnsAsync(new DeletePlantResult(DeletePlantStatus.HasChildren, 2));

        var result = Assert.IsType<ConflictObjectResult>(await c.DeletePlant("u1", "p1", "plant-1"));

        Assert.Equal("has_children", Prop(result.Value, "code"));
        Assert.Equal(2, Prop(result.Value, "childCount"));
        Assert.Null(result.Value!.GetType().GetProperty("field")!.GetValue(result.Value));
        Assert.NotNull(Prop(result.Value, "message"));
    }

    [Fact]
    public async Task DeletePlant_returns_404_when_missing()
    {
        var (c, s) = Plants();
        s.Setup(x => x.DeleteAsync("p1", "missing", false)).ReturnsAsync(new DeletePlantResult(DeletePlantStatus.NotFound, 0));

        Assert.IsType<NotFoundResult>(await c.DeletePlant("u1", "p1", "missing"));
    }

    [Fact]
    public async Task Plants_actions_return_404_for_a_project_the_caller_does_not_own_without_touching_the_service()
    {
        var (c, s) = Plants(owns: false);

        Assert.IsType<NotFoundResult>(await c.GetPlants("u1", "p1", new PlantListQuery()));
        Assert.IsType<NotFoundResult>(await c.CreatePlants("u1", "p1", new CreatePlantsRequest()));
        Assert.IsType<NotFoundResult>(await c.DeletePlant("u1", "p1", "a"));
        Assert.Empty(s.Invocations);
    }

    // ---- lines ----

    [Fact]
    public async Task Lines_create_rename_stable_delete_status_codes()
    {
        var (c, s) = Lines();
        s.Setup(x => x.CreateLineAsync("p1", It.IsAny<CreateLineRequest>())).ReturnsAsync(new LineDto { Id = 5 });
        s.Setup(x => x.RenameLineAsync("p1", 1, It.IsAny<RenameLineRequest>())).ReturnsAsync(new RenameLineResponse { NewLine = new LineDto(), OldLine = new LineDto() });
        s.Setup(x => x.RenameLineAsync("p1", 404, It.IsAny<RenameLineRequest>())).ReturnsAsync((RenameLineResponse?)null);
        s.Setup(x => x.SetStableAsync("p1", 1, true)).ReturnsAsync(new LineDto { IsStable = true });
        s.Setup(x => x.SetStableAsync("p1", 404, true)).ReturnsAsync((LineDto?)null);
        s.Setup(x => x.DeleteLineAsync("p1", 1)).ReturnsAsync(true);
        s.Setup(x => x.DeleteLineAsync("p1", 404)).ReturnsAsync(false);

        Assert.Equal(201, Assert.IsType<ObjectResult>(await c.CreateLine("u1", "p1", new CreateLineRequest())).StatusCode);
        Assert.Equal(201, Assert.IsType<ObjectResult>(await c.RenameLine("u1", "p1", 1, new RenameLineRequest())).StatusCode);
        Assert.IsType<NotFoundResult>(await c.RenameLine("u1", "p1", 404, new RenameLineRequest()));
        Assert.IsType<OkObjectResult>(await c.SetStable("u1", "p1", 1, new SetStableRequest { IsStable = true }));
        Assert.IsType<NotFoundResult>(await c.SetStable("u1", "p1", 404, new SetStableRequest { IsStable = true }));
        Assert.IsType<NoContentResult>(await c.DeleteLine("u1", "p1", 1));
        Assert.IsType<NotFoundResult>(await c.DeleteLine("u1", "p1", 404));
    }

    [Theory]
    [InlineData(409, "line_name_taken")]
    [InlineData(400, "founders_line")]
    [InlineData(409, "line_not_empty")]
    public async Task Lines_map_rule_errors(int status, string code)
    {
        var (c, s) = Lines();
        var error = new PedigreeException("line", code, "text", status);
        s.Setup(x => x.RenameLineAsync("p1", 1, It.IsAny<RenameLineRequest>())).ThrowsAsync(error);
        s.Setup(x => x.DeleteLineAsync("p1", 1)).ThrowsAsync(error);

        var rename = Assert.IsType<ObjectResult>(await c.RenameLine("u1", "p1", 1, new RenameLineRequest()));
        var delete = Assert.IsType<ObjectResult>(await c.DeleteLine("u1", "p1", 1));

        Assert.Equal(status, rename.StatusCode);
        Assert.Equal(code, Prop(delete.Value, "code"));
    }

    // ---- populations ----

    [Fact]
    public async Task Populations_create_201_delete_204_404_and_409()
    {
        var (c, s) = Populations();
        s.Setup(x => x.CreatePopulationAsync("p1", It.IsAny<CreatePopulationRequest>())).ReturnsAsync(new PopulationDto { Id = 3 });
        s.Setup(x => x.DeletePopulationAsync("p1", 3)).ReturnsAsync(true);
        s.Setup(x => x.DeletePopulationAsync("p1", 404)).ReturnsAsync(false);
        s.Setup(x => x.DeletePopulationAsync("p1", 9)).ThrowsAsync(PedigreeException.Conflict("populationId", PedigreeCodes.PopulationNotEmpty, "has plants"));

        Assert.Equal(201, Assert.IsType<ObjectResult>(await c.CreatePopulation("u1", "p1", new CreatePopulationRequest())).StatusCode);
        Assert.IsType<NoContentResult>(await c.DeletePopulation("u1", "p1", 3));
        Assert.IsType<NotFoundResult>(await c.DeletePopulation("u1", "p1", 404));
        var conflict = Assert.IsType<ObjectResult>(await c.DeletePopulation("u1", "p1", 9));
        Assert.Equal(409, conflict.StatusCode);
        Assert.Equal("population_not_empty", Prop(conflict.Value, "code"));
    }
}
