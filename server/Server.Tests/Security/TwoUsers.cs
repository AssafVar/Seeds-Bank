using Microsoft.EntityFrameworkCore;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Models;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

// Breeder A (the victim, user u1, project pA) and breeder B (the attacker,
// user u2, projects pB and pB2). Everything of A's has a tag, name or id that
// must never show up in an answer to B.
public sealed class TwoUsers
{
    public const string UserA = "u1";
    public const string UserB = "u2";
    public const string ProjectA = "pA";
    public const string ProjectB = "pB";
    public const string ProjectB2 = "pB2";
    public const string SecretTag = "SECRET-A-TAG";

    public TestServices S { get; private init; } = null!;

    public PlantDto AMother { get; private set; } = null!;
    public PlantDto AFather { get; private set; } = null!;
    public CreatePlantsResponse AF1 { get; private set; } = null!;
    public int AFieldId { get; private set; }
    public int AEmptyLineId { get; private set; }
    public int APlaceholderId { get; private set; }

    public PlantDto B1 { get; private set; } = null!;
    public PlantDto B2 { get; private set; } = null!;
    public int BFieldId { get; private set; }
    public PlantDto B2Founder { get; private set; } = null!;

    public static async Task<TwoUsers> CreateAsync(PedigreeOptions? options = null)
    {
        var s = TestServices.Create(options);
        var t = new TwoUsers { S = s };

        await s.ProjectAsync(UserA, ProjectA);
        await s.ProjectAsync(UserB, ProjectB);
        await s.ProjectAsync(UserB, ProjectB2);

        t.AFieldId = await AddFieldAsync(s, ProjectA, "Secret field of A");
        t.BFieldId = await AddFieldAsync(s, ProjectB, "Field of B");

        t.AMother = await s.FounderAsync(ProjectA, SecretTag);
        t.AFather = await s.FounderAsync(ProjectA);
        t.AF1 = await s.CrossAsync(ProjectA, t.AMother, t.AFather, "Roma A", count: 2);
        t.AEmptyLineId = (await s.Lines.CreateLineAsync(ProjectA, new CreateLineRequest { Name = "Empty A" })).Id;
        var founders = await s.Db.Lines.SingleAsync(l => l.ProjectId == ProjectA && l.IsFounders);
        t.APlaceholderId = (await s.Lines.CreatePopulationAsync(ProjectA,
            new CreatePopulationRequest { LineId = founders.Id, Season = "Spring", Year = 2026, FieldId = t.AFieldId })).Id;

        t.B1 = await s.FounderAsync(ProjectB);
        t.B2 = await s.FounderAsync(ProjectB);
        t.B2Founder = await s.FounderAsync(ProjectB2);
        return t;
    }

    public static async Task<int> AddFieldAsync(TestServices s, string projectId, string name)
    {
        var field = new Field { ProjectId = projectId, Name = name, VerticesJson = "[]", CreatedAt = DateTime.UtcNow };
        s.Db.Fields.Add(field);
        await s.Db.SaveChangesAsync();
        return field.Id;
    }

    // Everything B's calls could damage, as counts and values.
    public async Task<string> SnapshotOfAAsync() =>
        System.Text.Json.JsonSerializer.Serialize(new
        {
            Plants = await S.Db.ProjectItems.AsNoTracking().Where(i => i.ProjectId == ProjectA).OrderBy(i => i.Tag)
                .Select(i => new { i.PlantId, i.Tag, i.PopulationId, i.MotherPlantId, i.FatherPlantId, i.FruitColor, i.RowVersion }).ToListAsync(),
            Lines = await S.Db.Lines.AsNoTracking().Where(l => l.ProjectId == ProjectA).OrderBy(l => l.Id)
                .Select(l => new { l.Id, l.Name, l.Code, l.IsStable, l.SuccessorLineId, l.NextSeq }).ToListAsync(),
            Populations = await S.Db.Populations.AsNoTracking().Where(p => p.ProjectId == ProjectA).OrderBy(p => p.Id)
                .Select(p => new { p.Id, p.LineId, p.Kind, p.Generation, p.Season, p.Year, p.FieldId }).ToListAsync(),
            Origins = await S.Db.LineOrigins.AsNoTracking().Where(o => o.Line.ProjectId == ProjectA).OrderBy(o => o.Id).CountAsync(),
        });
}
