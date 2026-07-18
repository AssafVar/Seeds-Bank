using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class NewsService : INewsService
{
    private readonly AppDbContext _db;

    public NewsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<NewsPostDto>> GetAllAsync()
    {
        var posts = await _db.NewsPosts.AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return posts.Select(ToDto).ToList();
    }

    public async Task<NewsPostDto> CreateAsync(NewsPostRequest request)
    {
        var post = new NewsPost
        {
            Title = request.Title,
            Body = request.Body,
            CreatedAt = DateTime.UtcNow,
        };

        _db.NewsPosts.Add(post);
        await _db.SaveChangesAsync();

        return ToDto(post);
    }

    public async Task<bool> UpdateAsync(int id, NewsPostRequest request)
    {
        var post = await _db.NewsPosts.FirstOrDefaultAsync(p => p.Id == id);
        if (post is null)
        {
            return false;
        }

        post.Title = request.Title;
        post.Body = request.Body;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var post = await _db.NewsPosts.FirstOrDefaultAsync(p => p.Id == id);
        if (post is null)
        {
            return false;
        }

        _db.NewsPosts.Remove(post);
        await _db.SaveChangesAsync();
        return true;
    }

    private static NewsPostDto ToDto(NewsPost post) => new()
    {
        Id = post.Id,
        Title = post.Title,
        Body = post.Body,
        CreatedAt = post.CreatedAt,
    };
}
