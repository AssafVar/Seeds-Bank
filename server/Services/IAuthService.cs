using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IAuthService
{
    Task SignupAsync(SignupRequest request);
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}
