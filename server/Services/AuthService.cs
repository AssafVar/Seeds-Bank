using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(AppDbContext db, IJwtTokenService jwtTokenService)
    {
        _db = db;
        _jwtTokenService = jwtTokenService;
    }

    public async Task SignupAsync(SignupRequest request)
    {
        var user = new User
        {
            UserId = request.UserId,
            UserName = request.UserName,
            Email = request.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 11),
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
        {
            return null;
        }

        return new LoginResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.Email,
            Token = _jwtTokenService.GenerateToken(user),
        };
    }
}
