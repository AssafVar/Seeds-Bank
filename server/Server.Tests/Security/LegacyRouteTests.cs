using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.Tests.Controllers;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

public class LegacyRouteTests
{
    [Fact]
    public async Task LegacySave_Returns410_AndWritesNothing()
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();
        var projects = await t.S.Db.Projects.AsNoTracking().OrderBy(p => p.ProjectId).Select(p => new { p.ProjectId, p.LastUpdate }).ToListAsync();
        var controller = new ProjectsController(t.S.Projects);
        ControllerTestHelpers.SetUser(controller, TwoUsers.UserA);

        var result = await controller.LegacySave(TwoUsers.UserA, TwoUsers.ProjectA);

        var gone = Assert.IsType<ObjectResult>(result);
        Assert.Equal(410, gone.StatusCode);
        Assert.Equal("This page is out of date. Reload and try again.", gone.Value!.GetType().GetProperty("message")!.GetValue(gone.Value));
        Assert.False(t.S.Db.ChangeTracker.HasChanges());
        Assert.Equal(before, await t.SnapshotOfAAsync());
        Assert.Equal(
            System.Text.Json.JsonSerializer.Serialize(projects),
            System.Text.Json.JsonSerializer.Serialize(await t.S.Db.Projects.AsNoTracking().OrderBy(p => p.ProjectId).Select(p => new { p.ProjectId, p.LastUpdate }).ToListAsync()));
    }

    [Fact]
    public void LegacySave_binds_no_body()
    {
        var parameters = typeof(ProjectsController).GetMethod(nameof(ProjectsController.LegacySave))!.GetParameters();

        Assert.Equal(new[] { "userId", "projectId" }, parameters.Select(p => p.Name));
        Assert.All(parameters, p => Assert.Equal(typeof(string), p.ParameterType));
    }

    [Fact]
    public async Task LegacySave_WrongUser_Returns403()
    {
        var t = await TwoUsers.CreateAsync();
        var controller = new ProjectsController(t.S.Projects);
        ControllerTestHelpers.SetUser(controller, TwoUsers.UserB);

        Assert.IsType<ForbidResult>(await controller.LegacySave(TwoUsers.UserA, TwoUsers.ProjectA));
    }

    [Fact]
    public async Task LegacySave_ForeignProject_Returns404_NotThe410()
    {
        var t = await TwoUsers.CreateAsync();
        var controller = new ProjectsController(t.S.Projects);
        ControllerTestHelpers.SetUser(controller, TwoUsers.UserB);

        Assert.IsType<NotFoundResult>(await controller.LegacySave(TwoUsers.UserB, TwoUsers.ProjectA));
    }
}
