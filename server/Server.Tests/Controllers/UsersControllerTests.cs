using Microsoft.AspNetCore.Mvc;
using Moq;
using SeedsBank.Server.Controllers;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Controllers;

public class UsersControllerTests
{
    private static SignupRequest MakeSignupRequest() => new() { UserId = "u1", Email = "casey@example.com", Password = "hunter22" };

    [Fact]
    public async Task Signup_returns_ok_when_the_account_is_created()
    {
        var service = new Mock<IAuthService>();
        service.Setup(s => s.SignupAsync(It.IsAny<SignupRequest>())).ReturnsAsync(true);
        var controller = new UsersController(service.Object);

        var result = await controller.Signup(MakeSignupRequest());

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Signup_returns_conflict_when_the_email_is_already_registered()
    {
        var service = new Mock<IAuthService>();
        service.Setup(s => s.SignupAsync(It.IsAny<SignupRequest>())).ReturnsAsync(false);
        var controller = new UsersController(service.Object);

        var result = await controller.Signup(MakeSignupRequest());

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task Login_returns_ok_with_a_token_for_correct_credentials()
    {
        var service = new Mock<IAuthService>();
        service.Setup(s => s.LoginAsync(It.IsAny<LoginRequest>())).ReturnsAsync(new LoginResponse { UserId = "u1", Email = "casey@example.com", Token = "jwt" });
        var controller = new UsersController(service.Object);

        var result = await controller.Login(new LoginRequest { Email = "casey@example.com", Password = "hunter22" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Login_returns_unauthorized_for_incorrect_credentials()
    {
        var service = new Mock<IAuthService>();
        service.Setup(s => s.LoginAsync(It.IsAny<LoginRequest>())).ReturnsAsync((LoginResponse?)null);
        var controller = new UsersController(service.Object);

        var result = await controller.Login(new LoginRequest { Email = "casey@example.com", Password = "wrong" });

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task UpdateProfile_returns_ok_for_the_caller_s_own_authenticated_userId()
    {
        var service = new Mock<IAuthService>();
        service.Setup(s => s.UpdateProfileAsync("u1", "New Name")).ReturnsAsync(true);
        var controller = new UsersController(service.Object);
        ControllerTestHelpers.SetUser(controller, "u1");

        var result = await controller.UpdateProfile(new UpdateProfileRequest { UserName = "New Name" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task UpdateProfile_returns_not_found_when_the_user_no_longer_exists()
    {
        var service = new Mock<IAuthService>();
        service.Setup(s => s.UpdateProfileAsync("u1", "New Name")).ReturnsAsync(false);
        var controller = new UsersController(service.Object);
        ControllerTestHelpers.SetUser(controller, "u1");

        var result = await controller.UpdateProfile(new UpdateProfileRequest { UserName = "New Name" });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateProfile_returns_unauthorized_when_the_request_has_no_userId_claim()
    {
        var service = new Mock<IAuthService>();
        var controller = new UsersController(service.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext(),
        };

        var result = await controller.UpdateProfile(new UpdateProfileRequest { UserName = "New Name" });

        Assert.IsType<UnauthorizedResult>(result);
    }
}
