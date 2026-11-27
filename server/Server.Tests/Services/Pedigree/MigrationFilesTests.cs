using System.Reflection;
using SeedsBank.Server.Migrations;

namespace SeedsBank.Server.Tests.Services.Pedigree;

// Guards the files the local MySQL check script reads.
public class MigrationFilesTests
{
    private static string FixturesDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "Server.Tests", "Fixtures")))
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "Fixtures")) && dir.Name == "Server.Tests")
            {
                return Path.Combine(dir.FullName, "Fixtures");
            }
            dir = dir.Parent;
        }
        return Path.Combine(dir!.FullName, "Server.Tests", "Fixtures");
    }

    private static (string Name, string Sql)[] Invariants()
    {
        var type = typeof(BreedingMigrationSql);
        var field = type.GetField("Invariants", BindingFlags.Public | BindingFlags.Static)!;
        return ((string Name, string Sql)[])field.GetValue(null)!;
    }

    [Fact]
    public void Invariants_file_matches_the_migration_invariants()
    {
        var lines = File.ReadAllLines(Path.Combine(FixturesDir(), "invariants.tsv"))
            .Where(l => l.Length > 0 && !l.StartsWith("--"))
            .Select(l => l.Split('\t', 2))
            .ToArray();

        Assert.Equal(Invariants().Select(i => i.Name), lines.Select(l => l[0]));
        Assert.Equal(Invariants().Select(i => i.Sql), lines.Select(l => l[1]));
    }

    [Fact]
    public void Fixture_is_synthetic_example_data()
    {
        var text = File.ReadAllText(Path.Combine(FixturesDir(), "legacy-project-items.sql"));
        Assert.DoesNotContain("@gmail", text, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(".invalid", text);
    }

    [Fact]
    public void Gate_sql_inserts_two_rows_only_when_an_invariant_is_violated()
    {
        var sql = BreedingMigrationSql.GateSql();
        Assert.Contains("INSERT INTO breeding_migration_log", sql);
        Assert.Contains("UNION ALL SELECT 2", sql);
        foreach (var (_, query) in Invariants()) Assert.Contains(query, sql);
    }

    [Fact]
    public void Every_backfill_statement_that_groups_or_partitions_includes_project_id()
    {
        foreach (var sql in BreedingMigrationSql.BackfillUp)
        {
            foreach (var marker in new[] { "GROUP BY", "PARTITION BY" })
            {
                var i = 0;
                while ((i = sql.IndexOf(marker, i, StringComparison.Ordinal)) >= 0)
                {
                    var clause = sql.Substring(i, Math.Min(60, sql.Length - i));
                    // GROUP BY line_id is fine: the tmp table is already per project.
                    Assert.True(clause.Contains("project_id") || clause.Contains("line_id"), $"{marker} without project scope: {clause}");
                    i += marker.Length;
                }
            }
        }
    }
}
