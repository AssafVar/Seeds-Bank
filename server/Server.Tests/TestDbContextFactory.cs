using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Data;

namespace SeedsBank.Server.Tests;

// A fresh in-memory database per call, keyed by a random name, so tests
// never see state left behind by another test.
public static class TestDbContextFactory
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }
}
