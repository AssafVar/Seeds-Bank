using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.Models;

namespace SeedsBank.Server.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectItem> ProjectItems => Set<ProjectItem>();
}
