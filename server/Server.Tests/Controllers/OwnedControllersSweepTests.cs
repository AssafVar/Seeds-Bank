using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Controllers;

// Reflection sweep over every controller that derives from
// OwnedResourceControllerBase, so a route added later without the basics
// fails the build.
public class OwnedControllersSweepTests
{
    private static IEnumerable<Type> OwnedControllers() =>
        typeof(OwnedResourceControllerBase).Assembly.GetTypes()
            .Where(t => !t.IsAbstract && typeof(OwnedResourceControllerBase).IsAssignableFrom(t));

    private static IEnumerable<MethodInfo> Actions(Type controller) =>
        controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes().OfType<HttpMethodAttribute>().Any());

    public static IEnumerable<object[]> Controllers() => OwnedControllers().Select(t => new object[] { t });

    [Theory]
    [MemberData(nameof(Controllers))]
    public void Controller_has_class_level_Authorize_and_no_AllowAnonymous(Type controller)
    {
        Assert.NotNull(controller.GetCustomAttribute<AuthorizeAttribute>());
        Assert.Null(controller.GetCustomAttribute<AllowAnonymousAttribute>());
        foreach (var action in Actions(controller))
        {
            Assert.Null(action.GetCustomAttribute<AllowAnonymousAttribute>());
        }
    }

    [Theory]
    [MemberData(nameof(Controllers))]
    public void Every_route_is_scoped_by_userId_and_the_action_takes_it(Type controller)
    {
        var prefix = controller.GetCustomAttribute<RouteAttribute>()?.Template ?? string.Empty;
        foreach (var action in Actions(controller))
        {
            var template = prefix + "/" + action.GetCustomAttributes().OfType<HttpMethodAttribute>().First().Template;
            Assert.Contains("{userId}", template);
            Assert.Contains(action.GetParameters(), p => p.Name == "userId");
        }
    }

    [Theory]
    [MemberData(nameof(Controllers))]
    public void Project_scoped_routes_take_projectId_and_the_controller_has_the_ownership_gate(Type controller)
    {
        var prefix = controller.GetCustomAttribute<RouteAttribute>()?.Template ?? string.Empty;
        var projectScoped = Actions(controller).Where(a =>
            (prefix + "/" + a.GetCustomAttributes().OfType<HttpMethodAttribute>().First().Template).Contains("{projectId}")).ToList();

        foreach (var action in projectScoped)
        {
            Assert.Contains(action.GetParameters(), p => p.Name == "projectId");
        }

        if (projectScoped.Count > 0)
        {
            // A constructor that passes IProjectsService to the base class is
            // what makes RejectUnlessOwnedProjectAsync usable.
            Assert.Contains(controller.GetConstructors().Single().GetParameters(), p => p.ParameterType == typeof(IProjectsService));
        }
    }

    private sealed class Probe : OwnedResourceControllerBase
    {
        public Probe(IProjectsService projects) : base(projects) { }
        public Task<IActionResult?> Gate(string userId, string projectId) => RejectUnlessOwnedProjectAsync(userId, projectId);
        public IActionResult Error(PedigreeException ex) => PedigreeError(ex);
    }

    [Fact]
    public async Task Gate_is_403_for_a_route_user_mismatch_and_never_asks_about_the_project()
    {
        var projects = new Mock<IProjectsService>();
        var probe = new Probe(projects.Object);
        ControllerTestHelpers.SetUser(probe, "u1");

        var result = await probe.Gate("someone-else", "p1");

        Assert.IsType<ForbidResult>(result);
        projects.Verify(p => p.IsProjectOwnedAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Gate_is_404_for_a_project_the_caller_does_not_own_same_as_a_missing_one()
    {
        var projects = new Mock<IProjectsService>();
        projects.Setup(p => p.IsProjectOwnedAsync("u1", It.IsAny<string>())).ReturnsAsync(false);
        var probe = new Probe(projects.Object);
        ControllerTestHelpers.SetUser(probe, "u1");

        var foreign = await probe.Gate("u1", "other-users-project");
        var missing = await probe.Gate("u1", "missing");

        Assert.IsType<NotFoundResult>(foreign);
        Assert.IsType<NotFoundResult>(missing);
    }

    [Fact]
    public async Task Gate_lets_the_owner_through()
    {
        var projects = new Mock<IProjectsService>();
        projects.Setup(p => p.IsProjectOwnedAsync("u1", "p1")).ReturnsAsync(true);
        var probe = new Probe(projects.Object);
        ControllerTestHelpers.SetUser(probe, "u1");

        Assert.Null(await probe.Gate("u1", "p1"));
    }

    [Fact]
    public async Task Admin_claim_gives_no_bypass()
    {
        var projects = new Mock<IProjectsService>();
        var probe = new Probe(projects.Object);
        ControllerTestHelpers.SetUser(probe, "admin-user");
        probe.ControllerContext.HttpContext.User.AddIdentity(
            new System.Security.Claims.ClaimsIdentity(new[] { new System.Security.Claims.Claim("isAdmin", "true") }));

        Assert.IsType<ForbidResult>(await probe.Gate("another-user", "p1"));
    }

    [Theory]
    [InlineData(400, "parent_not_found")]
    [InlineData(409, "tag_taken")]
    public void PedigreeError_has_message_field_code_and_the_exceptions_status(int status, string code)
    {
        var probe = new Probe(new Mock<IProjectsService>().Object);
        var result = Assert.IsType<ObjectResult>(probe.Error(new PedigreeException("tag", code, "msg", status)));

        Assert.Equal(status, result.StatusCode);
        var body = result.Value!;
        Assert.Equal("msg", body.GetType().GetProperty("message")!.GetValue(body));
        Assert.Equal("tag", body.GetType().GetProperty("field")!.GetValue(body));
        Assert.Equal(code, body.GetType().GetProperty("code")!.GetValue(body));
    }
}
