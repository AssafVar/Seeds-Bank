using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class VegetableVarietyServiceTests
{
    private static VegetableVarietyRequest MakeRequest(string name = "Cherry Tomato") => new()
    {
        Name = name,
        PlantSpacing = 0.3,
        RowSpacing = 0.5,
        WaterMmPerSeason = 400,
        FertilizerKgPer100m2 = 3,
        SeedBufferPercent = 0.15,
        SeedUnit = "seeds",
    };

    [Fact]
    public async Task CreateAsync_persists_and_returns_the_new_variety()
    {
        using var db = TestDbContextFactory.Create();
        var service = new VegetableVarietyService(db);

        var created = await service.CreateAsync(MakeRequest());

        Assert.NotEqual(0, created.Id);
        Assert.Equal("Cherry Tomato", created.Name);
        Assert.Equal(0.15, created.SeedBufferPercent);
    }

    [Fact]
    public async Task GetAllAsync_orders_varieties_alphabetically()
    {
        using var db = TestDbContextFactory.Create();
        var service = new VegetableVarietyService(db);
        await service.CreateAsync(MakeRequest("Zucchini"));
        await service.CreateAsync(MakeRequest("Basil"));

        var all = await service.GetAllAsync();

        Assert.Equal("Basil", all[0].Name);
        Assert.Equal("Zucchini", all[1].Name);
    }

    [Fact]
    public async Task UpdateAsync_overwrites_an_existing_variety()
    {
        using var db = TestDbContextFactory.Create();
        var service = new VegetableVarietyService(db);
        var created = await service.CreateAsync(MakeRequest());

        var request = MakeRequest("Cherry Tomato (updated)");
        request.WaterMmPerSeason = 500;
        var success = await service.UpdateAsync(created.Id, request);

        Assert.True(success);
        var all = await service.GetAllAsync();
        Assert.Equal("Cherry Tomato (updated)", all[0].Name);
        Assert.Equal(500, all[0].WaterMmPerSeason);
    }

    [Fact]
    public async Task UpdateAsync_returns_false_for_a_missing_variety()
    {
        using var db = TestDbContextFactory.Create();
        var service = new VegetableVarietyService(db);

        Assert.False(await service.UpdateAsync(999, MakeRequest()));
    }

    [Fact]
    public async Task DeleteAsync_removes_the_variety_and_returns_true()
    {
        using var db = TestDbContextFactory.Create();
        var service = new VegetableVarietyService(db);
        var created = await service.CreateAsync(MakeRequest());

        Assert.True(await service.DeleteAsync(created.Id));
        Assert.Empty(await service.GetAllAsync());
    }

    [Fact]
    public async Task DeleteAsync_returns_false_for_a_missing_variety()
    {
        using var db = TestDbContextFactory.Create();
        var service = new VegetableVarietyService(db);

        Assert.False(await service.DeleteAsync(999));
    }
}
