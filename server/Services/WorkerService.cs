using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class WorkerService : IWorkerService
{
    private readonly AppDbContext _db;

    public WorkerService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<WorkerDto>> GetAllAsync()
    {
        var workers = await _db.Workers.AsNoTracking()
            .OrderBy(w => w.Name)
            .ToListAsync();

        return workers.Select(ToDto).ToList();
    }

    public async Task<WorkerDto> CreateAsync(WorkerRequest request)
    {
        var worker = new Worker
        {
            Name = request.Name,
            Role = request.Role,
            HourlyRate = request.HourlyRate,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Workers.Add(worker);
        await _db.SaveChangesAsync();

        return ToDto(worker);
    }

    public async Task<bool> UpdateAsync(int id, WorkerRequest request)
    {
        var worker = await _db.Workers.FirstOrDefaultAsync(w => w.Id == id);
        if (worker is null)
        {
            return false;
        }

        worker.Name = request.Name;
        worker.Role = request.Role;
        worker.HourlyRate = request.HourlyRate;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var worker = await _db.Workers.FirstOrDefaultAsync(w => w.Id == id);
        if (worker is null)
        {
            return false;
        }

        // The Restrict FK on FieldWorkLog.WorkerId would reject this at the
        // DB level anyway, but checking here first gives a clear message
        // instead of a raw constraint-violation error.
        var hasLoggedHours = await _db.FieldWorkLogs.AnyAsync(l => l.WorkerId == id);
        if (hasLoggedHours)
        {
            throw new ArgumentException("This worker has logged hours on a field and can't be deleted.");
        }

        _db.Workers.Remove(worker);
        await _db.SaveChangesAsync();
        return true;
    }

    private static WorkerDto ToDto(Worker worker) => new()
    {
        Id = worker.Id,
        Name = worker.Name,
        Role = worker.Role,
        HourlyRate = worker.HourlyRate,
        CreatedAt = worker.CreatedAt,
    };
}
