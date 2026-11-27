using SeedsBank.Server.DTOs;
using SeedsBank.Server.Services.Pedigree;
using SeedsBank.Server.Tests.Services;

namespace SeedsBank.Server.Tests.Security;

public class ForeignAndMissingIdsTests
{
    // status | code | field | message with the id the caller sent blanked out
    private static async Task<string> OutcomeAsync(Func<Task> action, string sentId)
    {
        try
        {
            await action();
            return "ok";
        }
        catch (PedigreeException ex)
        {
            return $"{ex.StatusCode}|{ex.Code}|{ex.Field}|{ex.Message.Replace(sentId, "<id>")}";
        }
    }

    [Theory]
    [InlineData("line")]
    [InlineData("population")]
    [InlineData("field")]
    [InlineData("plant")]
    [InlineData("parent")]
    public async Task ForeignAndMissingIds_AreIndistinguishable(string kind)
    {
        var t = await TwoUsers.CreateAsync();
        var b = TwoUsers.ProjectB;

        async Task<(string Foreign, string Missing)> Compare(Func<string, int, Task> run, string foreignText, string missingText, int foreignNumber, int missingNumber) =>
            (await OutcomeAsync(() => run(foreignText, foreignNumber), foreignText), await OutcomeAsync(() => run(missingText, missingNumber), missingText));

        (string Foreign, string Missing) result = kind switch
        {
            "line" => await Compare((_, n) => t.S.Plants.CreateAsync(b, new CreatePlantsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, LineId = n }),
                "0", "0", t.AF1.Line.Id, 99999),
            "population" => await Compare((_, n) => t.S.Plants.CreateAsync(b, new CreatePlantsRequest { PopulationId = n }),
                "0", "0", t.AF1.Plants[0].PopulationId, 99999),
            "field" => await Compare((_, n) => t.S.Plants.CreateAsync(b, new CreatePlantsRequest { FieldId = n }),
                "0", "0", t.AFieldId, 99999),
            "plant" => await Compare((id, _) => PlantProbeAsync(t, id),
                t.AF1.Plants[0].PlantId, "no-such-plant", 0, 0),
            _ => await Compare((id, _) => t.S.Plants.CreateAsync(b, new CreatePlantsRequest { MotherPlantId = id, FatherPlantId = t.B1.PlantId }),
                t.AMother.PlantId, "no-such-plant", 0, 0),
        };

        Assert.Equal(result.Missing, result.Foreign);
        Assert.NotEqual("ok", result.Foreign); // never accepted
        Assert.DoesNotContain("something answered", result.Foreign);
    }

    // Get, update, update parents and delete of a plant id all end the same way.
    private static async Task PlantProbeAsync(TwoUsers t, string plantId)
    {
        var b = TwoUsers.ProjectB;
        var get = await t.S.Plants.GetPlantAsync(b, plantId);
        var update = await t.S.Plants.UpdateTraitsAsync(b, plantId, new UpdatePlantRequest { Version = 1 });
        var parents = await t.S.Plants.UpdateParentsAsync(b, plantId, new UpdateParentsRequest { MotherPlantId = t.B1.PlantId, FatherPlantId = t.B2.PlantId, Version = 1 });
        var delete = await t.S.Plants.DeleteAsync(b, plantId, true);
        if (get is not null || update is not null || parents is not null || delete.Status != SeedsBank.Server.Services.DeletePlantStatus.NotFound)
        {
            throw new PedigreeException(null, "found", "something answered");
        }
        throw new PedigreeException("plantId", "not_found", "null for all four");
    }
}
