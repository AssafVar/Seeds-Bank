using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Moq;
using Npgsql;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Postgres;

// Runs against a real Postgres (TEST_POSTGRES); see PostgresFactAttribute.
// Each test gets its own freshly migrated database.
public class PostgresIntegrationTests
{
    private static async Task<(TestServices Services, string ProjectId)> NewProjectAsync(PostgresTestDb pg, string projectId = "p1")
    {
        var s = new TestServices(pg.NewContext());
        await s.ProjectAsync("u1", projectId);
        return (s, projectId);
    }

    [PostgresFact]
    public void Migrations_apply_and_the_model_has_no_pending_changes()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        using var db = pg.NewContext();

        Assert.Empty(db.Database.GetPendingMigrations());
        Assert.Single(db.Database.GetAppliedMigrations());
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [PostgresFact]
    public async Task Parallel_CreatePlants_on_one_line_gives_unique_gap_free_tags()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (setup, projectId) = await NewProjectAsync(pg);
        setup.Db.Dispose();

        const int workers = 6;
        const int perCall = 5;
        var results = await Task.WhenAll(Enumerable.Range(0, workers).Select(async _ =>
        {
            await using var db = pg.NewContext();
            var s = new TestServices(db);
            return await s.Plants.CreateAsync(projectId, new CreatePlantsRequest { Count = perCall });
        }));

        var tags = results.SelectMany(r => r.Plants).Select(p => p.Tag).ToList();
        Assert.Equal(workers * perCall, tags.Count);
        Assert.Equal(tags.Count, tags.Distinct(StringComparer.OrdinalIgnoreCase).Count());

        var expected = Enumerable.Range(1, workers * perCall).Select(n => $"P-{n:000}").OrderBy(t => t).ToList();
        Assert.Equal(expected, tags.OrderBy(t => t).ToList());

        await using var check = pg.NewContext();
        Assert.Equal(workers * perCall + 1, (await check.Lines.SingleAsync(l => l.IsFounders)).NextSeq);
    }

    [PostgresFact]
    public async Task Parallel_creates_with_the_same_custom_tag_leave_one_plant_and_conflicts_for_the_rest()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (setup, projectId) = await NewProjectAsync(pg);
        setup.Db.Dispose();

        var outcomes = await Task.WhenAll(Enumerable.Range(0, 5).Select(async _ =>
        {
            await using var db = pg.NewContext();
            var s = new TestServices(db);
            try
            {
                await s.Plants.CreateAsync(projectId, new CreatePlantsRequest { Tag = "Dup-1" });
                return (PedigreeException?)null;
            }
            catch (PedigreeException ex)
            {
                return ex;
            }
        }));

        Assert.Equal(1, outcomes.Count(o => o is null));
        Assert.All(outcomes.Where(o => o is not null), o => Assert.Equal(409, o!.StatusCode));
        await using var check = pg.NewContext();
        Assert.Equal(1, await check.ProjectItems.CountAsync(i => i.Tag == "Dup-1"));
    }

    [PostgresFact]
    public async Task A_unique_index_violation_is_a_database_error_and_the_service_maps_it_to_409()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (s, projectId) = await NewProjectAsync(pg);
        var first = await s.FounderAsync(projectId, tag: "Alpha");

        // Straight to the database, bypassing the service's pre-check: the index itself refuses.
        await using (var raw = pg.NewContext())
        {
            raw.ProjectItems.Add(new ProjectItem { PlantId = "x1", ProjectId = projectId, Tag = "ALPHA", PopulationId = (await raw.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == first.PlantId)).PopulationId });
            var ex = await Assert.ThrowsAsync<DbUpdateException>(() => raw.SaveChangesAsync());
            Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(ex.InnerException).SqlState);
        }

        // Through the service: a fixed-text 409, no SQL.
        var conflict = await Assert.ThrowsAsync<PedigreeException>(
            () => s.Plants.CreateAsync(projectId, new CreatePlantsRequest { Tag = "alpha" }));
        Assert.Equal(409, conflict.StatusCode);
        Assert.Equal(PedigreeCodes.TagTaken, conflict.Code);
    }

    [PostgresFact]
    public async Task Duplicate_project_id_is_a_409_through_the_unique_key()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (s, projectId) = await NewProjectAsync(pg);

        var ex = await Assert.ThrowsAsync<PedigreeException>(() => s.ProjectAsync("u1", projectId));
        Assert.Equal(409, ex.StatusCode);
    }

    [PostgresFact]
    public async Task Email_login_and_signup_ignore_case()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        await using var db = pg.NewContext();
        var jwt = new Mock<IJwtTokenService>();
        jwt.Setup(j => j.GenerateToken(It.IsAny<User>())).Returns("token");
        var auth = new AuthService(db, jwt.Object);

        Assert.True(await auth.SignupAsync(new SignupRequest { UserId = "u1", Email = "Casey@Example.com", Password = "hunter22" }));

        var login = await auth.LoginAsync(new LoginRequest { Email = "casey@EXAMPLE.com", Password = "hunter22" });
        Assert.NotNull(login);
        Assert.Equal("u1", login!.UserId);

        Assert.False(await auth.SignupAsync(new SignupRequest { UserId = "u2", Email = "CASEY@example.COM", Password = "other-pass1" }));
    }

    [PostgresFact]
    public async Task Tags_and_line_names_are_unique_ignoring_case()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (s, projectId) = await NewProjectAsync(pg);

        await s.FounderAsync(projectId, tag: "Roma-1");
        var tagClash = await Assert.ThrowsAsync<PedigreeException>(
            () => s.Plants.CreateAsync(projectId, new CreatePlantsRequest { Tag = "ROMA-1" }));
        Assert.Equal(409, tagClash.StatusCode);

        await s.Lines.CreateLineAsync(projectId, new CreateLineRequest { Name = "Cherry" });
        var nameClash = await Assert.ThrowsAsync<PedigreeException>(
            () => s.Lines.CreateLineAsync(projectId, new CreateLineRequest { Name = "CHERRY" }));
        Assert.Equal(409, nameClash.StatusCode);
        Assert.Equal(PedigreeCodes.LineNameTaken, nameClash.Code);

        // The indexes themselves are case-insensitive too (citext), not just the pre-checks.
        await using var raw = pg.NewContext();
        raw.Lines.Add(new Line { ProjectId = projectId, Name = "cherry", Code = "ZZ" });
        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => raw.SaveChangesAsync());
        Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(ex.InnerException).SqlState);
    }

    [PostgresFact]
    public async Task Plant_search_by_LIKE_ignores_case_and_escapes_wildcards()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (s, projectId) = await NewProjectAsync(pg);
        await s.Plants.CreateAsync(projectId, new CreatePlantsRequest { Tag = "Tomato-A", FruitColor = "Deep Red" });
        await s.Plants.CreateAsync(projectId, new CreatePlantsRequest { Tag = "Tomato-B", FruitColor = "100% green" });
        await s.Plants.CreateAsync(projectId, new CreatePlantsRequest { Tag = "Pepper", SeedColor = "x_y" });

        async Task<string[]> Find(string q) =>
            (await s.Plants.GetPlantsAsync(projectId, new PlantListQuery { Q = q })).Items.Select(i => i.Tag).OrderBy(t => t).ToArray();

        Assert.Equal(new[] { "Tomato-A", "Tomato-B" }, await Find("TOMATO"));
        Assert.Equal(new[] { "Tomato-A" }, await Find("deep red"));
        Assert.Equal(new[] { "Tomato-B" }, await Find("100%"));
        Assert.Equal(new[] { "Pepper" }, await Find("x_y"));
        Assert.Empty(await Find("x_z"));
        // A literal backslash is escaped, not taken as the escape character.
        Assert.Empty(await Find("\\"));
    }

    [PostgresFact]
    public async Task DateTime_values_round_trip_and_serialize_without_an_offset()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var utc = new DateTime(2026, 3, 4, 5, 6, 7, DateTimeKind.Utc).AddTicks(1234560);
        var unspecified = new DateTime(2026, 7, 8, 9, 10, 11, DateTimeKind.Unspecified).AddTicks(7654320);
        var calendarDate = new DateTime(2026, 5, 20);

        int utcId, unspecifiedId;
        await using (var db = pg.NewContext())
        {
            var a = new Worker { Name = "Utc", CreatedAt = utc };
            var b = new Worker { Name = "Unspecified", CreatedAt = unspecified };
            db.Workers.AddRange(a, b);
            await db.SaveChangesAsync();
            utcId = a.Id;
            unspecifiedId = b.Id;
            db.FieldWorkLogs.Add(new FieldWorkLog
            {
                Field = new Field { ProjectId = "p", Name = "F", VerticesJson = "[]", CreatedAt = utc },
                WorkerId = a.Id,
                WorkDate = calendarDate,
                HoursWorked = 1,
                CreatedAt = utc,
            });
            db.Projects.Add(new Project { ProjectId = "p", UserId = "u", ProjectName = "n", PlantType = "t", StartDate = utc, LastUpdate = utc });
            await db.SaveChangesAsync();
        }

        await using var read = pg.NewContext();
        var gotUtc = (await read.Workers.AsNoTracking().SingleAsync(w => w.Id == utcId)).CreatedAt;
        var gotUnspecified = (await read.Workers.AsNoTracking().SingleAsync(w => w.Id == unspecifiedId)).CreatedAt;
        var gotDate = (await read.FieldWorkLogs.AsNoTracking().SingleAsync()).WorkDate;

        // Wall-clock values come back unchanged; reads are Kind Unspecified, as with MySQL.
        Assert.Equal(utc.Ticks, gotUtc.Ticks);
        Assert.Equal(unspecified.Ticks, gotUnspecified.Ticks);
        Assert.Equal(DateTimeKind.Unspecified, gotUtc.Kind);
        Assert.Equal(DateTimeKind.Unspecified, gotUnspecified.Kind);
        Assert.Equal(calendarDate, gotDate);

        // JSON shape: no "Z", no offset.
        Assert.Equal("\"2026-03-04T05:06:07.123456\"", JsonSerializer.Serialize(gotUtc));
        Assert.Equal("\"2026-05-20T00:00:00\"", JsonSerializer.Serialize(gotDate));
    }

    [PostgresFact]
    public async Task The_database_stamps_created_at_in_utc_when_a_plant_is_inserted_without_one()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (s, projectId) = await NewProjectAsync(pg);
        var plant = await s.FounderAsync(projectId);

        var before = DateTime.UtcNow;
        await using var db = pg.NewContext();
        var populationId = (await db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == plant.PlantId)).PopulationId;
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO project_items (plant_id, project_id, tag, population_id) VALUES ('raw1', {projectId}, 'RAW-1', {populationId})");

        var stamped = (await db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == "raw1")).CreatedAt;
        Assert.InRange(stamped, before.AddMinutes(-5), DateTime.UtcNow.AddMinutes(5));
    }

    [PostgresFact]
    public async Task Deleting_a_project_removes_its_whole_tree()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (s, projectId) = await NewProjectAsync(pg);
        var mother = await s.FounderAsync(projectId);
        var father = await s.FounderAsync(projectId);
        await s.CrossAsync(projectId, mother, father, newLineName: "Cross", count: 3);
        await s.Lines.CreateLineAsync(projectId, new CreateLineRequest { Name = "Spare" });
        await s.Db.SaveChangesAsync();

        await using (var seen = pg.NewContext())
        {
            Assert.Equal(5, await seen.ProjectItems.CountAsync());
            Assert.Equal(3, await seen.Lines.CountAsync());
            Assert.NotEqual(0, await seen.LineOrigins.CountAsync());
        }

        await using (var db = pg.NewContext())
        {
            db.Projects.Remove(await db.Projects.SingleAsync(p => p.ProjectId == projectId));
            await db.SaveChangesAsync();
        }

        await using var after = pg.NewContext();
        Assert.Equal(0, await after.ProjectItems.CountAsync());
        Assert.Equal(0, await after.Populations.CountAsync());
        Assert.Equal(0, await after.Lines.CountAsync());
        Assert.Equal(0, await after.LineOrigins.CountAsync());
    }

    [PostgresFact]
    public async Task Parallel_signups_with_the_same_email_in_different_case_leave_exactly_one_user()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var jwt = new Mock<IJwtTokenService>();
        var gate = new TaskCompletionSource();

        var tasks = Enumerable.Range(0, 6).Select(n => Task.Run(async () =>
        {
            await using var db = pg.NewContext();
            await db.Database.OpenConnectionAsync();
            var auth = new AuthService(db, jwt.Object);
            await gate.Task;
            var email = n % 2 == 0 ? "Race@Example.com" : "RACE@example.COM";
            return await auth.SignupAsync(new SignupRequest { UserId = $"u{n}", Email = email, Password = "hunter22x" });
        })).ToList();
        gate.SetResult();
        var results = await Task.WhenAll(tasks);

        Assert.Equal(1, results.Count(r => r));
        await using var check = pg.NewContext();
        Assert.Equal(1, await check.Users.CountAsync());
    }

    [PostgresFact]
    public async Task The_users_email_index_refuses_a_duplicate_in_another_case()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        await using var db = pg.NewContext();
        db.Users.AddRange(
            new User { UserId = "a", Email = "x@example.com", Password = "p" },
            new User { UserId = "b", Email = "X@EXAMPLE.COM", Password = "p" });
        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        var pgEx = Assert.IsType<PostgresException>(ex.InnerException);
        Assert.Equal(PostgresErrorCodes.UniqueViolation, pgEx.SqlState);
        Assert.Equal("IX_users_email", pgEx.ConstraintName);
    }

    [PostgresFact]
    public async Task Too_long_citext_values_are_rejected_by_the_database()
    {
        using var pg = TestDbContextFactory.CreatePostgres();
        var (s, projectId) = await NewProjectAsync(pg);
        var plant = await s.FounderAsync(projectId);
        var populationId = (await s.Db.ProjectItems.AsNoTracking().SingleAsync(i => i.PlantId == plant.PlantId)).PopulationId;

        async Task AssertCheckViolation(Action<AppDbContext> add, string constraint)
        {
            await using var db = pg.NewContext();
            add(db);
            var ex = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
            var pgEx = Assert.IsType<PostgresException>(ex.InnerException);
            Assert.Equal(PostgresErrorCodes.CheckViolation, pgEx.SqlState);
            Assert.Equal(constraint, pgEx.ConstraintName);
        }

        await AssertCheckViolation(db => db.ProjectItems.Add(new ProjectItem
            { PlantId = "long1", ProjectId = projectId, Tag = new string('t', 41), PopulationId = populationId }), "CK_project_items_tag_length");
        await AssertCheckViolation(db => db.Lines.Add(new Line
            { ProjectId = projectId, Name = new string('n', 101), Code = "OK" }), "CK_lines_name_length");
        await AssertCheckViolation(db => db.Lines.Add(new Line
            { ProjectId = projectId, Name = "Fine", Code = "TOOLONG" }), "CK_lines_code_length");

        // At the limit is fine.
        await using var ok = pg.NewContext();
        ok.ProjectItems.Add(new ProjectItem { PlantId = "ok1", ProjectId = projectId, Tag = new string('t', 40), PopulationId = populationId });
        ok.Lines.Add(new Line { ProjectId = projectId, Name = new string('n', 100), Code = "ABCDEF" });
        await ok.SaveChangesAsync();
    }
}
