using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface IAuthService
{
    Task<bool> SignupAsync(SignupRequest request);
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<bool> UpdateProfileAsync(string userId, string? userName);
}
