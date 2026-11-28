using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
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
    public DbSet<Line> Lines => Set<Line>();
    public DbSet<Population> Populations => Set<Population>();
    public DbSet<LineOrigin> LineOrigins => Set<LineOrigin>();

    // Every DateTime is a UTC wall-clock value or a calendar date, stored
    // without a zone (the server never converts between zones). Reads come
    // back as Kind Unspecified, so the JSON the client sees has no offset.
    // Npgsql refuses to write a Kind=Utc value (DateTime.UtcNow) to a
    // timestamp-without-zone column, hence the converter on the way in.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // The in-memory provider (unit tests) stores the CLR value as is.
        if (!Database.IsNpgsql()) return;

        configurationBuilder.Properties<DateTime>()
            .HaveColumnType("timestamp without time zone")
            .HaveConversion<UnspecifiedKindDateTimeConverter>();
    }

    private sealed class UnspecifiedKindDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public UnspecifiedKindDateTimeConverter()
            : base(v => DateTime.SpecifyKind(v, DateTimeKind.Unspecified), v => v)
        {
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // citext keeps the case-insensitive comparison the unique indexes,
        // login and LIKE search rely on (a plain text column is case-sensitive).
        modelBuilder.HasPostgresExtension("citext");
        modelBuilder.Entity<User>().Property(u => u.Email).HasColumnType("citext");
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

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

        ConfigureBreeding(modelBuilder);
    }

    // Lines, populations, plants. Everything inside a project's tree cascades
    // from the project (a RESTRICT in the middle would make the database reject a
    // project delete with a foreign key violation); plant- and line-level safety lives in
    // the services, not in RESTRICT foreign keys.
    private static void ConfigureBreeding(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Line>(e =>
        {
            e.HasOne<Project>().WithMany().HasForeignKey(l => l.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Successor).WithMany().HasForeignKey(l => l.SuccessorLineId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(l => new { l.ProjectId, l.Name }).IsUnique();
            e.HasIndex(l => new { l.ProjectId, l.Code }).IsUnique();
            e.HasIndex(l => l.SuccessorLineId);
            e.Property(l => l.NextSeq).HasDefaultValue(1).IsConcurrencyToken();
            e.Property(l => l.IsFounders).HasDefaultValue(false);
            e.Property(l => l.IsStable).HasDefaultValue(false);
            e.Property(l => l.Name).HasColumnType("citext");
            e.Property(l => l.Code).HasColumnType("citext");
            // citext ignores maxLength, so the caps are check constraints.
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_lines_name_length", "char_length(name) <= 100");
                t.HasCheckConstraint("CK_lines_code_length", "char_length(code) <= 6");
            });
        });

        modelBuilder.Entity<Population>(e =>
        {
            e.HasOne<Project>().WithMany().HasForeignKey(p => p.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.Line).WithMany(l => l.Populations).HasForeignKey(p => p.LineId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.Field).WithMany().HasForeignKey(p => p.FieldId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(p => p.ProjectId);
            e.HasIndex(p => new { p.LineId, p.Kind, p.Generation, p.Season, p.Year, p.FieldId }).IsUnique();
            e.HasIndex(p => p.FieldId);
        });

        modelBuilder.Entity<LineOrigin>(e =>
        {
            e.HasOne(o => o.Line).WithMany(l => l.Origins).HasForeignKey(o => o.LineId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(o => o.SourceLine).WithMany().HasForeignKey(o => o.SourceLineId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(o => o.LineId);
            e.HasIndex(o => o.SourceLineId);
        });

        modelBuilder.Entity<ProjectItem>(e =>
        {
            e.HasOne<Project>().WithMany().HasForeignKey(i => i.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Population).WithMany().HasForeignKey(i => i.PopulationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<ProjectItem>().WithMany().HasForeignKey(i => i.MotherPlantId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne<ProjectItem>().WithMany().HasForeignKey(i => i.FatherPlantId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(i => new { i.ProjectId, i.Tag }).IsUnique();
            e.HasIndex(i => i.PopulationId);
            e.HasIndex(i => i.MotherPlantId);
            e.HasIndex(i => i.FatherPlantId);
            e.Property(i => i.RowVersion).HasDefaultValue(1).IsConcurrencyToken();
            e.Property(i => i.CreatedAt).HasDefaultValueSql("now() at time zone 'utc'");
            e.Property(i => i.Tag).HasColumnType("citext");
            e.ToTable(t => t.HasCheckConstraint("CK_project_items_tag_length", "char_length(tag) <= 40"));
            e.Property(i => i.FruitColor).HasColumnType("citext");
            e.Property(i => i.FruitWeight).HasColumnType("citext");
            e.Property(i => i.SeedColor).HasColumnType("citext");
            e.Property(i => i.SeedWeight).HasColumnType("citext");
        });
    }
}
