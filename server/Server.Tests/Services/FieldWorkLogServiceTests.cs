using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;

namespace SeedsBank.Server.Tests.Services;

public class FieldWorkLogServiceTests
{
    private static async Task<(Field field, Worker worker)> SeedFieldAndWorker(Data.AppDbContext db, string projectId = "p1")
    {
        var field = new Field { Name = "North plot", ProjectId = projectId, VerticesJson = "[]" };
        var worker = new Worker { Name = "Alice", HourlyRate = 15, CreatedAt = DateTime.UtcNow };
        db.Fields.Add(field);
        db.Workers.Add(worker);
        await db.SaveChangesAsync();
        return (field, worker);
    }

    [Fact]
    public async Task CreateAsync_logs_hours_at_the_worker_s_current_rate()
    {
        using var db = TestDbContextFactory.Create();
        var (field, worker) = await SeedFieldAndWorker(db);
        var service = new FieldWorkLogService(db);

        var log = await service.CreateAsync("p1", field.Id, new FieldWorkLogRequest { WorkerId = worker.Id, WorkDate = DateTime.UtcNow, HoursWorked = 4 });

        Assert.NotNull(log);
        Assert.Equal("Alice", log!.WorkerName);
        Assert.Equal(15, log.HourlyRateAtEntry);
        Assert.Equal(60, log.Cost);
    }

    [Fact]
    public async Task CreateAsync_returns_null_for_a_field_outside_the_given_project()
    {
        using var db = TestDbContextFactory.Create();
        var (field, worker) = await SeedFieldAndWorker(db, projectId: "p1");
        var service = new FieldWorkLogService(db);

        var log = await service.CreateAsync("different-project", field.Id, new FieldWorkLogRequest { WorkerId = worker.Id, WorkDate = DateTime.UtcNow, HoursWorked = 4 });

        Assert.Null(log);
    }

    [Fact]
    public async Task CreateAsync_throws_for_an_unknown_worker()
    {
        using var db = TestDbContextFactory.Create();
        var (field, _) = await SeedFieldAndWorker(db);
        var service = new FieldWorkLogService(db);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync("p1", field.Id, new FieldWorkLogRequest { WorkerId = 999, WorkDate = DateTime.UtcNow, HoursWorked = 4 }));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task CreateAsync_throws_for_non_positive_hours(double hours)
    {
        using var db = TestDbContextFactory.Create();
        var (field, worker) = await SeedFieldAndWorker(db);
        var service = new FieldWorkLogService(db);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync("p1", field.Id, new FieldWorkLogRequest { WorkerId = worker.Id, WorkDate = DateTime.UtcNow, HoursWorked = hours }));
    }

    [Fact]
    public async Task GetByFieldAsync_orders_logs_by_most_recent_work_date_first()
    {
        using var db = TestDbContextFactory.Create();
        var (field, worker) = await SeedFieldAndWorker(db);
        var service = new FieldWorkLogService(db);
        await service.CreateAsync("p1", field.Id, new FieldWorkLogRequest { WorkerId = worker.Id, WorkDate = new DateTime(2026, 1, 1), HoursWorked = 2 });
        await service.CreateAsync("p1", field.Id, new FieldWorkLogRequest { WorkerId = worker.Id, WorkDate = new DateTime(2026, 3, 1), HoursWorked = 3 });

        var logs = await service.GetByFieldAsync("p1", field.Id);

        Assert.Equal(2, logs.Count);
        Assert.Equal(new DateTime(2026, 3, 1), logs[0].WorkDate);
    }

    [Fact]
    public async Task DeleteAsync_removes_the_log_and_returns_true()
    {
        using var db = TestDbContextFactory.Create();
        var (field, worker) = await SeedFieldAndWorker(db);
        var service = new FieldWorkLogService(db);
        var log = await service.CreateAsync("p1", field.Id, new FieldWorkLogRequest { WorkerId = worker.Id, WorkDate = DateTime.UtcNow, HoursWorked = 4 });

        var success = await service.DeleteAsync("p1", field.Id, log!.Id);

        Assert.True(success);
        Assert.Empty(await service.GetByFieldAsync("p1", field.Id));
    }

    [Fact]
    public async Task DeleteAsync_returns_false_for_a_log_outside_the_given_project()
    {
        using var db = TestDbContextFactory.Create();
        var (field, worker) = await SeedFieldAndWorker(db);
        var service = new FieldWorkLogService(db);
        var log = await service.CreateAsync("p1", field.Id, new FieldWorkLogRequest { WorkerId = worker.Id, WorkDate = DateTime.UtcNow, HoursWorked = 4 });

        var success = await service.DeleteAsync("different-project", field.Id, log!.Id);

        Assert.False(success);
    }
}
