using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class WorkerServiceTests
{
    private static WorkerRequest MakeRequest(string name = "Alice") => new()
    {
        Name = name,
        Role = "Picker",
        HourlyRate = 15,
    };

    [Fact]
    public async Task CreateAsync_persists_and_returns_the_new_worker()
    {
        using var db = TestDbContextFactory.Create();
        var service = new WorkerService(db);

        var created = await service.CreateAsync(MakeRequest());

        Assert.NotEqual(0, created.Id);
        Assert.Equal("Alice", created.Name);
        Assert.Equal(15, created.HourlyRate);
    }

    [Fact]
    public async Task GetAllAsync_orders_workers_alphabetically()
    {
        using var db = TestDbContextFactory.Create();
        var service = new WorkerService(db);
        await service.CreateAsync(MakeRequest("Zoe"));
        await service.CreateAsync(MakeRequest("Amir"));

        var all = await service.GetAllAsync();

        Assert.Equal("Amir", all[0].Name);
        Assert.Equal("Zoe", all[1].Name);
    }

    [Fact]
    public async Task UpdateAsync_overwrites_an_existing_worker()
    {
        using var db = TestDbContextFactory.Create();
        var service = new WorkerService(db);
        var created = await service.CreateAsync(MakeRequest());

        var success = await service.UpdateAsync(created.Id, new WorkerRequest { Name = "Alicia", Role = "Packer", HourlyRate = 18 });

        Assert.True(success);
        var all = await service.GetAllAsync();
        Assert.Equal("Alicia", all[0].Name);
        Assert.Equal("Packer", all[0].Role);
        Assert.Equal(18, all[0].HourlyRate);
    }

    [Fact]
    public async Task UpdateAsync_returns_false_for_a_missing_worker()
    {
        using var db = TestDbContextFactory.Create();
        var service = new WorkerService(db);

        Assert.False(await service.UpdateAsync(999, MakeRequest()));
    }

    [Fact]
    public async Task DeleteAsync_removes_a_worker_with_no_logged_hours()
    {
        using var db = TestDbContextFactory.Create();
        var service = new WorkerService(db);
        var created = await service.CreateAsync(MakeRequest());

        Assert.True(await service.DeleteAsync(created.Id));
        Assert.Empty(await service.GetAllAsync());
    }

    [Fact]
    public async Task DeleteAsync_returns_false_for_a_missing_worker()
    {
        using var db = TestDbContextFactory.Create();
        var service = new WorkerService(db);

        Assert.False(await service.DeleteAsync(999));
    }

    [Fact]
    public async Task DeleteAsync_throws_when_the_worker_has_logged_hours_on_a_field()
    {
        using var db = TestDbContextFactory.Create();
        var service = new WorkerService(db);
        var worker = await service.CreateAsync(MakeRequest());

        var field = new Field { Name = "North plot", ProjectId = "p1", VerticesJson = "[]" };
        db.Fields.Add(field);
        await db.SaveChangesAsync();
        db.FieldWorkLogs.Add(new FieldWorkLog
        {
            FieldId = field.Id,
            WorkerId = worker.Id,
            WorkDate = DateTime.UtcNow,
            HoursWorked = 4,
            HourlyRateAtEntry = 15,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteAsync(worker.Id));
    }
}
