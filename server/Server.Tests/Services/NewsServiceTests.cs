using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class NewsServiceTests
{
    [Fact]
    public async Task CreateAsync_persists_and_returns_the_new_post()
    {
        using var db = TestDbContextFactory.Create();
        var service = new NewsService(db);

        var created = await service.CreateAsync(new NewsPostRequest { Title = "Season opens", Body = "Planting begins" });

        Assert.NotEqual(0, created.Id);
        Assert.Equal("Season opens", created.Title);

        var all = await service.GetAllAsync();
        Assert.Single(all);
    }

    [Fact]
    public async Task GetAllAsync_orders_posts_newest_first()
    {
        using var db = TestDbContextFactory.Create();
        var service = new NewsService(db);
        var older = await service.CreateAsync(new NewsPostRequest { Title = "Older", Body = "..." });
        await Task.Delay(5); // guarantee a distinct CreatedAt from the first post
        var newer = await service.CreateAsync(new NewsPostRequest { Title = "Newer", Body = "..." });

        var all = await service.GetAllAsync();

        Assert.Equal(newer.Id, all[0].Id);
        Assert.Equal(older.Id, all[1].Id);
    }

    [Fact]
    public async Task UpdateAsync_returns_false_for_a_missing_post_and_does_not_throw()
    {
        using var db = TestDbContextFactory.Create();
        var service = new NewsService(db);

        var success = await service.UpdateAsync(999, new NewsPostRequest { Title = "x", Body = "y" });

        Assert.False(success);
    }

    [Fact]
    public async Task UpdateAsync_overwrites_title_and_body_for_an_existing_post()
    {
        using var db = TestDbContextFactory.Create();
        var service = new NewsService(db);
        var created = await service.CreateAsync(new NewsPostRequest { Title = "Draft", Body = "..." });

        var success = await service.UpdateAsync(created.Id, new NewsPostRequest { Title = "Final", Body = "Done" });

        Assert.True(success);
        var all = await service.GetAllAsync();
        Assert.Equal("Final", all[0].Title);
        Assert.Equal("Done", all[0].Body);
    }

    [Fact]
    public async Task DeleteAsync_removes_the_post_and_returns_true()
    {
        using var db = TestDbContextFactory.Create();
        var service = new NewsService(db);
        var created = await service.CreateAsync(new NewsPostRequest { Title = "Temp", Body = "..." });

        var success = await service.DeleteAsync(created.Id);

        Assert.True(success);
        Assert.Empty(await service.GetAllAsync());
    }

    [Fact]
    public async Task DeleteAsync_returns_false_for_a_missing_post()
    {
        using var db = TestDbContextFactory.Create();
        var service = new NewsService(db);

        Assert.False(await service.DeleteAsync(999));
    }
}
