using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Services;

public class FieldWorkLogService : IFieldWorkLogService
{
    private readonly AppDbContext _db;

    public FieldWorkLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<FieldWorkLogDto>> GetByFieldAsync(string projectId, int fieldId)
    {
        var logs = await _db.FieldWorkLogs.AsNoTracking()
            .Include(l => l.Worker)
            .Where(l => l.FieldId == fieldId && l.Field.ProjectId == projectId)
            .OrderByDescending(l => l.WorkDate)
            .ToListAsync();

        return logs.Select(ToDto).ToList();
    }

    public async Task<FieldWorkLogDto?> CreateAsync(string projectId, int fieldId, FieldWorkLogRequest request)
    {
        var field = await _db.Fields.FirstOrDefaultAsync(f => f.Id == fieldId && f.ProjectId == projectId);
        if (field is null)
        {
            return null;
        }

        var worker = await _db.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId);
        if (worker is null)
        {
            throw new ArgumentException("Worker not found.");
        }
        if (request.HoursWorked is not > 0)
        {
            throw new ArgumentException("Hours worked must be positive.");
        }

        var log = new FieldWorkLog
        {
            FieldId = fieldId,
            WorkerId = worker.Id,
            WorkDate = request.WorkDate,
            HoursWorked = request.HoursWorked,
            HourlyRateAtEntry = worker.HourlyRate,
            CreatedAt = DateTime.UtcNow,
        };

        _db.FieldWorkLogs.Add(log);
        await _db.SaveChangesAsync();

        log.Worker = worker;
        return ToDto(log);
    }

    public async Task<bool> DeleteAsync(string projectId, int fieldId, int logId)
    {
        var log = await _db.FieldWorkLogs
            .FirstOrDefaultAsync(l => l.Id == logId && l.FieldId == fieldId && l.Field.ProjectId == projectId);
        if (log is null)
        {
            return false;
        }

        _db.FieldWorkLogs.Remove(log);
        await _db.SaveChangesAsync();
        return true;
    }

    private static FieldWorkLogDto ToDto(FieldWorkLog log) => new()
    {
        Id = log.Id,
        FieldId = log.FieldId,
        WorkerId = log.WorkerId,
        WorkerName = log.Worker.Name,
        WorkDate = log.WorkDate,
        HoursWorked = log.HoursWorked,
        HourlyRateAtEntry = log.HourlyRateAtEntry,
        Cost = log.HoursWorked * log.HourlyRateAtEntry,
        CreatedAt = log.CreatedAt,
    };
}
