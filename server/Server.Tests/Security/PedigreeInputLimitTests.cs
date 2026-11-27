using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

public class PedigreeInputLimitTests
{
    // ---- count and quotas ----

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(501)]
    [InlineData(int.MaxValue)]
    public async Task CreatePlant_CountZeroNegativeOver500_400(int count)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var ex = await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = count }), "invalid_input", 400);

        Assert.Equal("count", ex.Field);
        Assert.Empty(s.Db.ProjectItems);
    }

    [Fact]
    public async Task CreatePlant_Count500_IsTheMaximumAndWorks()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var result = await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 500 });

        Assert.Equal(500, result.Plants.Count);
        Assert.Equal(500, result.Plants.Select(x => x.Tag).Distinct().Count());
    }

    [Fact]
    public async Task CreatePlant_CustomTagWithCountOver1_400()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var ex = await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest { Tag = "MINE", Count = 2 }), "invalid_input", 400);

        Assert.Equal("count", ex.Field);
        Assert.Empty(s.Db.ProjectItems);
    }

    [Fact]
    public async Task CreatePlant_OverProjectQuota_400()
    {
        var s = TestServices.Create(new PedigreeOptions { MaxPlantsPerProject = 3 });
        var p = await s.ProjectAsync();
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 2 });

        var ex = await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 2 }), "quota_exceeded", 400);

        Assert.Equal("This project is at its limit of 3 plants.", ex.Message);
        Assert.Equal(2, await s.Db.ProjectItems.CountAsync());
        Assert.Equal(1, (await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 1 })).Plants.Count);
        await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest()), "quota_exceeded", 400);
    }

    [Fact]
    public async Task CreatePlant_QuotaIsPerProject()
    {
        var s = TestServices.Create(new PedigreeOptions { MaxPlantsPerProject = 2 });
        var one = await s.ProjectAsync("u1", "p1");
        var two = await s.ProjectAsync("u2", "p2");
        await s.Plants.CreateAsync(one, new CreatePlantsRequest { Count = 2 });

        Assert.Equal(2, (await s.Plants.CreateAsync(two, new CreatePlantsRequest { Count = 2 })).Plants.Count);
    }

    [Fact]
    public async Task Quota_lines_per_project_and_populations_per_line_are_400()
    {
        var s = TestServices.Create(new PedigreeOptions { MaxLinesPerProject = 2, MaxPopulationsPerLine = 1 });
        var p = await s.ProjectAsync();
        var founders = await s.Db.Lines.SingleAsync(l => l.IsFounders);

        await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Second" });
        await TestServices.Rejects(() => s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Third" }), "quota_exceeded", 400);

        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        await TestServices.Rejects(() => s.CrossAsync(p, a, b, "Fourth"), "quota_exceeded", 400);

        await TestServices.Rejects(() => s.Lines.CreatePopulationAsync(p,
            new CreatePopulationRequest { LineId = founders.Id, Season = "Winter", Year = 2026 }), "quota_exceeded", 400);
        await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = "Winter", Year = 2026 }), "quota_exceeded", 400);
        Assert.Equal(2, await s.Db.Lines.CountAsync());
        Assert.Equal(1, await s.Db.Populations.CountAsync());
    }

    // ---- tag and names ----

    [Theory]
    [InlineData("a b")]
    [InlineData("a/b")]
    [InlineData("<script>")]
    [InlineData("a;drop table")]
    [InlineData("ta\ng")]
    [InlineData("a​b")]
    [InlineData("ünï")]
    [InlineData("0123456789012345678901234")] // 25
    public async Task Tag_InvalidChars_400(string tag)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var ex = await TestServices.Rejects(() => s.FounderAsync(p, tag), "invalid_tag", 400);

        Assert.Equal("tag", ex.Field);
        Assert.Empty(s.Db.ProjectItems);
    }

    [Fact]
    public async Task Tag_24_valid_characters_is_accepted()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var plant = await s.FounderAsync(p, "A-b_c.D12345678901234567".Substring(0, 24));

        Assert.Equal(24, plant.Tag.Length);
    }

    public static IEnumerable<object[]> BadLineNames() => new[]
    {
        "a\u0000b", "a​b", "a‮b", "a\tb", "a\nb", "<b>x</b>", "a.b", "a_b", "x'; drop table lines;--", "   ", "",
    }.Select(n => new object[] { n });

    [Theory]
    [MemberData(nameof(BadLineNames))]
    public async Task LineName_ControlAndZeroWidthChars_400(string name)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        var a = await s.FounderAsync(p);
        var b = await s.FounderAsync(p);
        var first = await s.CrossAsync(p, a, b, "Roma A");
        var lines = await s.Db.Lines.CountAsync();

        var create = await TestServices.Rejects(() => s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = name }), "invalid_line_name", 400);
        await TestServices.Rejects(() => s.Lines.RenameLineAsync(p, first.Line.Id, new RenameLineRequest { NewName = name }), "invalid_line_name", 400);
        if (!string.IsNullOrWhiteSpace(name))
        {
            await TestServices.Rejects(() => s.CrossAsync(p, a, b, name), "invalid_line_name", 400);
        }

        Assert.Equal("lineName", create.Field);
        Assert.Equal(lines, await s.Db.Lines.CountAsync());
    }

    [Fact]
    public async Task LineName_Length41_400_and_Length40_ok()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        await TestServices.Rejects(() => s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = new string('a', 41) }), "invalid_line_name", 400);
        var ok = await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = new string('a', 40) });

        Assert.Equal(40, ok.Name.Length);
    }

    [Fact]
    public async Task OriginNote_Length201_400_and_Length200_ok()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var ex = await TestServices.Rejects(() => s.Lines.CreateLineAsync(p,
            new CreateLineRequest { Name = "Long note", OriginNote = new string('n', 201) }), "invalid_input", 400);
        await TestServices.Rejects(() => s.Lines.CreateLineAsync(p,
            new CreateLineRequest { Name = "Bad note", OriginNote = "line\u0000break" }), "invalid_input", 400);
        var ok = await s.Lines.CreateLineAsync(p, new CreateLineRequest { Name = "Long note", OriginNote = new string('n', 200) });

        Assert.Equal("originNote", ex.Field);
        Assert.Equal(200, ok.OriginNote!.Length);
        Assert.Equal(2, await s.Db.Lines.CountAsync());
    }

    // ---- season, year ----

    [Theory]
    [InlineData("winter")]
    [InlineData("Monsoon")]
    [InlineData("Spring; drop")]
    public async Task Season_outside_the_four_values_is_400(string season)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var ex = await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest { Season = season }), "invalid_input", 400);

        Assert.Equal("season", ex.Field);
    }

    [Theory]
    [InlineData(1899)]
    [InlineData(2101)]
    [InlineData(-5)]
    public async Task Year_outside_1900_2100_is_400(int year)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var ex = await TestServices.Rejects(() => s.Plants.CreateAsync(p, new CreatePlantsRequest { Year = year }), "invalid_input", 400);

        Assert.Equal("year", ex.Field);
    }

    // ---- search and paging ----

    [Fact]
    public async Task Search_QOver100_400()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();

        var list = await TestServices.Rejects(() => s.Plants.GetPlantsAsync(p, new PlantListQuery { Q = new string('x', 101) }), "query_too_long", 400);
        await TestServices.Rejects(() => s.Plants.GetCountsAsync(p, new PlantCountsQuery { Q = new string('x', 101) }), "query_too_long", 400);

        Assert.Equal("q", list.Field);
        Assert.Equal(0, (await s.Plants.GetPlantsAsync(p, new PlantListQuery { Q = new string('x', 100) })).TotalCount);
    }

    [Fact]
    public async Task List_PageSizeAbove100_ClampedTo100()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 120 });

        var page = await s.Plants.GetPlantsAsync(p, new PlantListQuery { PageSize = 5000 });

        Assert.Equal(100, page.PageSize);
        Assert.Equal(100, page.Items.Count);
        Assert.Equal(120, page.TotalCount);
        Assert.Equal(1, (await s.Plants.GetPlantsAsync(p, new PlantListQuery { PageSize = 0 })).Items.Count);
        Assert.Equal(1, (await s.Plants.GetPlantsAsync(p, new PlantListQuery { PageSize = -3 })).PageSize);
    }

    [Fact]
    public async Task List_DefaultPageSize_25()
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.Plants.CreateAsync(p, new CreatePlantsRequest { Count = 40 });

        var page = await s.Plants.GetPlantsAsync(p, new PlantListQuery());

        Assert.Equal(25, new PlantListQuery().PageSize);
        Assert.Equal(25, page.PageSize);
        Assert.Equal(25, page.Items.Count);
        Assert.Equal(1, page.Page);
    }

    [Theory]
    [InlineData(int.MaxValue, int.MaxValue)]
    [InlineData(int.MaxValue, 100)]
    [InlineData(0, 25)]
    [InlineData(-7, 25)]
    [InlineData(100001, 100)]
    public async Task List_HugePageNumber_NoOverflow_NoException(int page, int pageSize)
    {
        var s = TestServices.Create();
        var p = await s.ProjectAsync();
        await s.FounderAsync(p);

        var result = await s.Plants.GetPlantsAsync(p, new PlantListQuery { Page = page, PageSize = pageSize });

        Assert.InRange(result.Page, 1, 100_000);
        Assert.InRange(result.PageSize, 1, 100);
        if (page > 1) Assert.Empty(result.Items);
        Assert.Equal(1, result.TotalCount);
    }

    // ---- request size ----

    [Fact]
    public void Every_new_POST_and_PUT_action_has_a_RequestSizeLimit_of_64_KiB()
    {
        var controllers = new[] { typeof(SeedsBank.Server.Controllers.PlantsController), typeof(SeedsBank.Server.Controllers.LinesController), typeof(SeedsBank.Server.Controllers.PopulationsController) };
        var checkedActions = 0;
        foreach (var controller in controllers)
        {
            foreach (var action in controller.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly))
            {
                var attrs = action.GetCustomAttributes(true);
                if (!attrs.Any(a => a is Microsoft.AspNetCore.Mvc.HttpPostAttribute or Microsoft.AspNetCore.Mvc.HttpPutAttribute)) continue;

                var limit = Assert.Single(attrs.OfType<Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute>());
                var bytes = (long)typeof(Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute)
                    .GetField("_bytes", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.GetValue(limit)!;
                Assert.Equal(65536, bytes);
                checkedActions++;
            }
        }

        Assert.Equal(7, checkedActions); // create, update, parents, line create, rename, stable, population create
    }
}
