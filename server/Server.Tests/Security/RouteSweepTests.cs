using Microsoft.EntityFrameworkCore;
using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.Extensions.DependencyInjection;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.Tests.Controllers;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

// Every action of the new controllers (and the project routes), found by
// reflection so a route added later is covered without touching this file.
public class RouteSweepTests
{
    private static readonly Type[] Controllers =
    {
        typeof(ProjectsController), typeof(PlantsController), typeof(LinesController), typeof(PopulationsController),
    };

    private static IEnumerable<MethodInfo> Actions(Type controller) =>
        controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes().OfType<HttpMethodAttribute>().Any());

    // Only the routes that carry a projectId: they are the project-scoped ones.
    private static IEnumerable<MethodInfo> ProjectActions(Type controller) =>
        Actions(controller).Where(a => a.GetParameters().Any(p => p.Name == "projectId"));

    public static IEnumerable<object[]> AllActions() =>
        Controllers.SelectMany(c => Actions(c).Select(a => new object[] { c.Name, a.Name })).Distinct();

    public static IEnumerable<object[]> ProjectScopedActions() =>
        Controllers.SelectMany(c => ProjectActions(c).Select(a => new object[] { c.Name, a.Name }));

    private static MethodInfo Find(string controller, string action) =>
        Actions(Controllers.Single(c => c.Name == controller)).Single(a => a.Name == action);

    private static ControllerBase Build(string controllerName, TestServices s, string callerUserId, bool admin = false)
    {
        ControllerBase controller = controllerName switch
        {
            nameof(ProjectsController) => new ProjectsController(s.Projects),
            nameof(PlantsController) => new PlantsController(s.Plants, s.Projects),
            nameof(LinesController) => new LinesController(s.Lines, s.Projects),
            nameof(PopulationsController) => new PopulationsController(s.Lines, s.Projects),
            _ => throw new InvalidOperationException(controllerName),
        };
        ControllerTestHelpers.SetUser(controller, callerUserId);
        if (admin)
        {
            controller.ControllerContext.HttpContext.User.AddIdentity(new ClaimsIdentity(new[] { new Claim("isAdmin", "true") }));
        }
        return controller;
    }

    private static async Task<IActionResult> Call(ControllerBase controller, MethodInfo action, string userId, string projectId)
    {
        var args = action.GetParameters().Select(p => p.Name switch
        {
            "userId" => userId,
            "projectId" => projectId,
            _ when p.ParameterType == typeof(string) => "1",
            _ when p.ParameterType == typeof(int) => 1,
            _ when p.ParameterType == typeof(bool) => false,
            _ => Activator.CreateInstance(p.ParameterType),
        }).ToArray();
        return await (Task<IActionResult>)action.Invoke(controller, args)!;
    }

    [Fact]
    public void The_sweep_finds_every_action_of_the_new_controllers()
    {
        // GET list and POST create of projects are user-scoped only.
        Assert.Equal(2, ProjectActions(typeof(ProjectsController)).Count());
        Assert.Equal(8, ProjectActions(typeof(PlantsController)).Count());
        Assert.Equal(4, ProjectActions(typeof(LinesController)).Count());
        Assert.Equal(2, ProjectActions(typeof(PopulationsController)).Count());
        Assert.Equal(16, ProjectScopedActions().Count());
    }

    [Theory]
    [MemberData(nameof(AllActions))]
    public async Task Plants_Lines_Populations_RouteUserMismatch_Returns403(string controller, string action)
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        // B's token, A's userId in the route, A's real project.
        var result = await Call(Build(controller, t.S, TwoUsers.UserB), Find(controller, action), TwoUsers.UserA, TwoUsers.ProjectA);

        Assert.IsType<ForbidResult>(result);
        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Theory]
    [MemberData(nameof(ProjectScopedActions))]
    public async Task AllRoutes_ForeignProject_Returns404_SameBodyAsMissing(string controller, string action)
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();
        var counts = (await t.S.Db.ProjectItems.CountAsync(), await t.S.Db.Lines.CountAsync(), await t.S.Db.Populations.CountAsync());

        // B's own userId, A's project, versus a project that does not exist.
        var foreign = await Call(Build(controller, t.S, TwoUsers.UserB), Find(controller, action), TwoUsers.UserB, TwoUsers.ProjectA);
        var missing = await Call(Build(controller, t.S, TwoUsers.UserB), Find(controller, action), TwoUsers.UserB, "no-such-project");

        Assert.IsType<NotFoundResult>(foreign);
        Assert.IsType<NotFoundResult>(missing);
        Assert.Equal(404, ((NotFoundResult)foreign).StatusCode);
        Assert.Equal(before, await t.SnapshotOfAAsync());
        Assert.Equal(counts, (await t.S.Db.ProjectItems.CountAsync(), await t.S.Db.Lines.CountAsync(), await t.S.Db.Populations.CountAsync()));
    }

    [Theory]
    [MemberData(nameof(AllActions))]
    public async Task Admin_CannotReadOrWriteBreedersPedigree(string controller, string action)
    {
        var t = await TwoUsers.CreateAsync();
        var before = await t.SnapshotOfAAsync();

        // An admin token (isAdmin = true) with A's userId in the route: 403 like anyone else.
        var result = await Call(Build(controller, t.S, "admin-1", admin: true), Find(controller, action), TwoUsers.UserA, TwoUsers.ProjectA);

        Assert.IsType<ForbidResult>(result);
        Assert.Equal(before, await t.SnapshotOfAAsync());
    }

    [Fact]
    public void NewControllers_HaveAuthorize_NoAllowAnonymous()
    {
        foreach (var controller in Controllers)
        {
            Assert.Contains(controller.GetCustomAttributes<AuthorizeAttribute>(), a => string.IsNullOrEmpty(a.Policy) || a.Policy == "AdminOnly");
            Assert.Null(controller.GetCustomAttribute<AllowAnonymousAttribute>());
            Assert.NotNull(controller.GetCustomAttribute<ApiControllerAttribute>());
            foreach (var action in Actions(controller))
            {
                Assert.Null(action.GetCustomAttribute<AllowAnonymousAttribute>());
            }
        }
    }

    [Fact]
    public void No_new_route_needs_the_admin_policy_or_returns_admin_lists()
    {
        foreach (var controller in Controllers)
        {
            Assert.DoesNotContain(controller.GetCustomAttributes<AuthorizeAttribute>(), a => a.Policy == "AdminOnly");
            foreach (var action in Actions(controller)) Assert.Null(action.GetCustomAttribute<AuthorizeAttribute>());
        }
    }

    [Theory]
    [MemberData(nameof(AllActions))]
    public async Task NewRoutes_WithoutToken_Return401(string controller, string action)
    {
        // The pipeline answers 401 when the endpoint's authorization policy
        // fails for an anonymous caller. Evaluate exactly that policy.
        var services = new ServiceCollection().AddLogging().AddAuthorization().BuildServiceProvider();
        var provider = services.GetRequiredService<IAuthorizationPolicyProvider>();
        var authorization = services.GetRequiredService<IAuthorizationService>();
        var type = Controllers.Single(c => c.Name == controller);
        var data = type.GetCustomAttributes<AuthorizeAttribute>(true).Cast<IAuthorizeData>()
            .Concat(Find(controller, action).GetCustomAttributes<AuthorizeAttribute>(true)).ToList();
        var policy = await AuthorizationPolicy.CombineAsync(provider, data);

        var anonymous = await authorization.AuthorizeAsync(new ClaimsPrincipal(new ClaimsIdentity()), null, policy!);
        var signedIn = await authorization.AuthorizeAsync(
            new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("userId", "u1") }, "Bearer")), null, policy!);

        Assert.NotNull(policy);
        Assert.False(anonymous.Succeeded);
        Assert.True(signedIn.Succeeded);
    }

    [Fact]
    public async Task LegacyDeleteRoute_NoLongerExists()
    {
        // The old DELETE projects/{userId}/{projectId}/{plantId} is gone from ProjectsController ...
        Assert.DoesNotContain(Actions(typeof(ProjectsController)), a => a.GetCustomAttributes().OfType<HttpDeleteAttribute>().Any());
        Assert.Null(typeof(ProjectsController).GetMethod("DeletePlant"));

        // ... and no DELETE template is a bare projects/{userId}/{projectId}/{x} anywhere.
        foreach (var type in typeof(ProjectsController).Assembly.GetTypes().Where(t => typeof(ControllerBase).IsAssignableFrom(t)))
        {
            var prefix = type.GetCustomAttribute<RouteAttribute>()?.Template ?? string.Empty;
            foreach (var delete in type.GetMethods().SelectMany(m => m.GetCustomAttributes().OfType<HttpDeleteAttribute>()))
            {
                var template = (prefix + "/" + delete.Template).Trim('/');
                Assert.DoesNotMatch(@"^projects/\{userId\}/\{projectId\}/\{[A-Za-z]+\}$", template);
            }
        }

        // The replacement is nested under plants.
        var plantDelete = Find(nameof(PlantsController), nameof(PlantsController.DeletePlant)).GetCustomAttribute<HttpDeleteAttribute>()!;
        Assert.Equal("{plantId}", plantDelete.Template);
        Assert.Equal("api/projects/{userId}/{projectId}/plants", typeof(PlantsController).GetCustomAttribute<RouteAttribute>()!.Template);
        await Task.CompletedTask;
    }
}
