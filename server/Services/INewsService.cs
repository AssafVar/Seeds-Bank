using SeedsBank.Server.DTOs;

namespace SeedsBank.Server.Services;

public interface INewsService
{
    Task<List<NewsPostDto>> GetAllAsync();
    Task<NewsPostDto> CreateAsync(NewsPostRequest request);
    Task<bool> UpdateAsync(int id, NewsPostRequest request);
    Task<bool> DeleteAsync(int id);
}
