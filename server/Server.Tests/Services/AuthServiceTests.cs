using Moq;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class AuthServiceTests
{
    private static (AuthService service, Mock<IJwtTokenService> jwt) MakeService(Data.AppDbContext db)
    {
        var jwt = new Mock<IJwtTokenService>();
        jwt.Setup(j => j.GenerateToken(It.IsAny<User>())).Returns("fake-jwt-token");
        return (new AuthService(db, jwt.Object), jwt);
    }

    [Fact]
    public async Task SignupAsync_creates_a_user_with_a_hashed_password()
    {
        using var db = TestDbContextFactory.Create();
        var (service, _) = MakeService(db);

        var success = await service.SignupAsync(new SignupRequest { UserId = "u1", Email = "casey@example.com", Password = "hunter22" });

        Assert.True(success);
        var stored = db.Users.Single();
        Assert.NotEqual("hunter22", stored.Password);
        Assert.True(BCrypt.Net.BCrypt.Verify("hunter22", stored.Password));
    }

    [Fact]
    public async Task SignupAsync_rejects_a_duplicate_email()
    {
        using var db = TestDbContextFactory.Create();
        var (service, _) = MakeService(db);
        await service.SignupAsync(new SignupRequest { UserId = "u1", Email = "casey@example.com", Password = "hunter22" });

        var success = await service.SignupAsync(new SignupRequest { UserId = "u2", Email = "casey@example.com", Password = "different1" });

        Assert.False(success);
        Assert.Single(db.Users);
    }

    [Fact]
    public async Task LoginAsync_returns_a_token_for_correct_credentials()
    {
        using var db = TestDbContextFactory.Create();
        var (service, jwt) = MakeService(db);
        await service.SignupAsync(new SignupRequest { UserId = "u1", UserName = "Casey", Email = "casey@example.com", Password = "hunter22" });

        var response = await service.LoginAsync(new LoginRequest { Email = "casey@example.com", Password = "hunter22" });

        Assert.NotNull(response);
        Assert.Equal("u1", response!.UserId);
        Assert.Equal("fake-jwt-token", response.Token);
        jwt.Verify(j => j.GenerateToken(It.Is<User>(u => u.UserId == "u1")), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_returns_null_for_an_incorrect_password()
    {
        using var db = TestDbContextFactory.Create();
        var (service, _) = MakeService(db);
        await service.SignupAsync(new SignupRequest { UserId = "u1", Email = "casey@example.com", Password = "hunter22" });

        var response = await service.LoginAsync(new LoginRequest { Email = "casey@example.com", Password = "wrong-password" });

        Assert.Null(response);
    }

    [Fact]
    public async Task LoginAsync_returns_null_for_an_unknown_email()
    {
        using var db = TestDbContextFactory.Create();
        var (service, _) = MakeService(db);

        var response = await service.LoginAsync(new LoginRequest { Email = "nobody@example.com", Password = "hunter22" });

        Assert.Null(response);
    }

    [Fact]
    public async Task UpdateProfileAsync_updates_the_user_name()
    {
        using var db = TestDbContextFactory.Create();
        var (service, _) = MakeService(db);
        await service.SignupAsync(new SignupRequest { UserId = "u1", Email = "casey@example.com", Password = "hunter22" });

        var success = await service.UpdateProfileAsync("u1", "New Name");

        Assert.True(success);
        Assert.Equal("New Name", db.Users.Single().UserName);
    }

    [Fact]
    public async Task UpdateProfileAsync_returns_false_for_a_missing_user()
    {
        using var db = TestDbContextFactory.Create();
        var (service, _) = MakeService(db);

        Assert.False(await service.UpdateProfileAsync("missing", "New Name"));
    }
}
