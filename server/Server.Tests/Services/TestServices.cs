using Microsoft.Extensions.Options;
using SeedsBank.Server.Data;
using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services;

// Builds the services the way Program.cs wires them, on one context.
public sealed class TestServices
{
    public TestServices(AppDbContext db, PedigreeOptions? options = null)
    {
        Db = db;
        Options = options ?? new PedigreeOptions();
        Lines = new LineService(db, Microsoft.Extensions.Options.Options.Create(Options));
        Plants = new PlantService(db, Lines, Microsoft.Extensions.Options.Options.Create(Options));
        Projects = new ProjectsService(db, Lines);
    }

    public AppDbContext Db { get; }
    public PedigreeOptions Options { get; }
    public LineService Lines { get; }
    public PlantService Plants { get; }
    public ProjectsService Projects { get; }

    public static TestServices Create(PedigreeOptions? options = null) => new(TestDbContextFactory.Create(), options);

    // A user with one project (and its Founders line).
    public async Task<string> ProjectAsync(string userId = "u1", string projectId = "p1")
    {
        await Projects.CreateProjectAsync(userId, new CreateProjectRequest { ProjectId = projectId, ProjectName = "Tomatoes", PlantType = "Vegetable" });
        return projectId;
    }

    public async Task<PlantDto> FounderAsync(string projectId, string? tag = null, string? fruitColor = null)
    {
        var result = await Plants.CreateAsync(projectId, new CreatePlantsRequest { Tag = tag, FruitColor = fruitColor });
        return result.Plants[0];
    }

    // A cross of two plants (new line when the parents are founders).
    public async Task<CreatePlantsResponse> CrossAsync(string projectId, PlantDto mother, PlantDto father, string? newLineName = null, int? lineId = null, int count = 1) =>
        await Plants.CreateAsync(projectId, new CreatePlantsRequest
        {
            MotherPlantId = mother.PlantId,
            FatherPlantId = father.PlantId,
            NewLineName = newLineName,
            LineId = lineId,
            Count = count,
        });

    // Asserts the exception's code and returns it.
    public static async Task<PedigreeException> Rejects(Func<Task> action, string code, int? status = null)
    {
        var ex = await Assert.ThrowsAsync<PedigreeException>(action);
        Assert.Equal(code, ex.Code);
        if (status is not null) Assert.Equal(status, ex.StatusCode);
        return ex;
    }
}
