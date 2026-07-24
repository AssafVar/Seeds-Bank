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
    public DbSet<SiteContent> SiteContents => Set<SiteContent>();
    public DbSet<GalleryImage> GalleryImages => Set<GalleryImage>();
    public DbSet<NewsPost> NewsPosts => Set<NewsPost>();
    public DbSet<Field> Fields => Set<Field>();
    public DbSet<VegetableVariety> VegetableVarieties => Set<VegetableVariety>();
    public DbSet<Worker> Workers => Set<Worker>();
    public DbSet<FieldWorkLog> FieldWorkLogs => Set<FieldWorkLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // EF's default for self-referencing FKs is Restrict (it won't guess
        // a cascade path). We want deleting a large field to take its
        // sub-fields with it, so set that explicitly.
        modelBuilder.Entity<Field>()
            .HasOne(f => f.Parent)
            .WithMany(f => f.Children)
            .HasForeignKey(f => f.ParentFieldId)
            .OnDelete(DeleteBehavior.Cascade);

        // A field's work logs have no meaning once the field itself is
        // gone, so they cascade away with it - but a worker with existing
        // logged hours can't be deleted out from under them (Restrict),
        // preserving historical labor records.
        modelBuilder.Entity<FieldWorkLog>()
            .HasOne(l => l.Field)
            .WithMany()
            .HasForeignKey(l => l.FieldId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FieldWorkLog>()
            .HasOne(l => l.Worker)
            .WithMany()
            .HasForeignKey(l => l.WorkerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
