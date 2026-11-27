using SeedsBank.Server.Migrations;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class BackupCleanupMigrationTests
{
    private static readonly DateTime Date = new(2026, 12, 27, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void ShouldDrop_is_false_before_the_date_and_true_on_and_after_it()
    {
        Assert.False(BackupCleanup.ShouldDrop(Date.AddTicks(-1), Date));
        Assert.True(BackupCleanup.ShouldDrop(Date, Date));
        Assert.True(BackupCleanup.ShouldDrop(Date.AddDays(400), Date));
    }

    [Fact]
    public void Default_date_is_30_days_after_the_release_date()
    {
        Assert.Equal(new DateTime(2026, 11, 27).AddDays(30), BackupCleanup.DefaultDropAfterUtc.Date);
    }

    [Fact]
    public void No_statements_before_the_date_and_only_the_backup_drop_after_it()
    {
        Assert.Empty(BackupCleanup.UpStatements(Date.AddDays(-1), Date));
        var sql = Assert.Single(BackupCleanup.UpStatements(Date.AddDays(1), Date));
        Assert.Equal("DROP TABLE IF EXISTS `project_items_backup_step1`;", sql);
    }

    [Fact]
    public void The_date_can_be_set_by_environment_and_an_unreadable_value_falls_back()
    {
        try
        {
            Environment.SetEnvironmentVariable(BackupCleanup.DropAfterVariable, "2030-05-01");
            Assert.Equal(new DateTime(2030, 5, 1), BackupCleanup.DropAfterUtc().Date);
            Environment.SetEnvironmentVariable(BackupCleanup.DropAfterVariable, "not a date");
            Assert.Equal(BackupCleanup.DefaultDropAfterUtc, BackupCleanup.DropAfterUtc());
        }
        finally { Environment.SetEnvironmentVariable(BackupCleanup.DropAfterVariable, null); }
    }

    [Fact]
    public void The_migration_file_runs_the_helper_and_never_touches_other_tables()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "Migrations"))) dir = dir.Parent;
        var file = Directory.GetFiles(Path.Combine(dir!.FullName, "Migrations"), "*_DropBreedingBackupStep1.cs").Single();
        var text = File.ReadAllText(file);

        Assert.Contains("BackupCleanup.UpStatements", text);
        Assert.DoesNotContain("DropTable", text);
        Assert.DoesNotContain("project_items\"", text);
    }
}
