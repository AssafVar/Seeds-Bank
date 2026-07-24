using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class JwtTokenServiceTests
{
    private static JwtTokenService MakeService()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "unit-test-signing-key-needs-to-be-long-enough-for-hmacsha256",
                ["Jwt:Issuer"] = "SeedsBankTests",
                ["Jwt:Audience"] = "SeedsBankTests",
                ["Jwt:ExpiresMinutes"] = "120",
            })
            .Build();

        return new JwtTokenService(config);
    }

    [Fact]
    public void GenerateToken_embeds_the_user_s_identity_and_admin_claims()
    {
        var service = MakeService();
        var user = new User { UserId = "u1", UserName = "Casey", Email = "casey@example.com", IsAdmin = true };

        var token = service.GenerateToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("u1", jwt.Claims.First(c => c.Type == "userId").Value);
        Assert.Equal("Casey", jwt.Claims.First(c => c.Type == "userName").Value);
        Assert.Equal("true", jwt.Claims.First(c => c.Type == "isAdmin").Value);
        Assert.Equal("SeedsBankTests", jwt.Issuer);
    }

    [Fact]
    public void GenerateToken_marks_a_non_admin_user_accordingly()
    {
        var service = MakeService();
        var user = new User { UserId = "u2", UserName = null, Email = "sam@example.com", IsAdmin = false };

        var token = service.GenerateToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("false", jwt.Claims.First(c => c.Type == "isAdmin").Value);
        Assert.Equal(string.Empty, jwt.Claims.First(c => c.Type == "userName").Value);
    }
}
