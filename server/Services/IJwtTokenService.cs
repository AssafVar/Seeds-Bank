using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public interface IJwtTokenService
{
    string GenerateToken(User user);
}
