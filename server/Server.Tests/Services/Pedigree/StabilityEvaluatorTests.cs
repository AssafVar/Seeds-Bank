using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class StabilityEvaluatorTests
{
    private static PlantTraits P(string color = "red", string fw = "10g", string sc = "black", string sw = "1g") =>
        PlantTraits.FromText(color, fw, sc, sw);

    private static GenerationSample Gen(int generation, params PlantTraits[] plants) =>
        new($"F{generation}", generation, plants);

    private static GenerationSample Uniform(int generation, int count = 5) =>
        Gen(generation, Enumerable.Range(0, count).Select(_ => P()).ToArray());

    private static StabilityResult Eval(params GenerationSample[] gens) =>
        StabilityEvaluator.Evaluate(false, false, gens);

    [Fact]
    public void Below_three_scored_plants_is_not_uniform()
    {
        var r = Eval(Uniform(1, 2), Uniform(2, 2));
        Assert.False(r.LooksStable);
        Assert.Equal("segregating", r.State);
    }

    [Fact]
    public void Plants_with_a_missing_trait_are_not_scored()
    {
        var plants = new[] { P(), P(), PlantTraits.FromText("red", null, "black", "1g") };
        Assert.False(Eval(Gen(1, plants), Uniform(2)).LooksStable);
    }

    [Fact]
    public void One_off_type_in_ten_is_allowed()
    {
        var plants = Enumerable.Range(0, 9).Select(_ => P()).Append(P(color: "yellow")).ToArray();
        Assert.True(Eval(Gen(1, plants), Uniform(2)).LooksStable);
    }

    [Fact]
    public void One_off_type_in_five_is_not_allowed()
    {
        var plants = Enumerable.Range(0, 4).Select(_ => P()).Append(P(color: "yellow")).ToArray();
        Assert.False(Eval(Gen(1, plants), Uniform(2)).LooksStable);
    }

    [Fact]
    public void Numeric_text_within_15_percent_of_the_median_is_on_type()
    {
        var plants = new[] { P(fw: "10g"), P(fw: "10.5 g"), P(fw: "10g"), P(fw: "10g"), P(fw: "10 g") };
        Assert.True(Eval(Gen(1, plants), Uniform(2)).LooksStable);
    }

    [Fact]
    public void Numeric_text_far_from_the_median_is_off_type()
    {
        var plants = new[] { P(fw: "10g"), P(fw: "13g"), P(fw: "10g"), P(fw: "10g"), P(fw: "10g") };
        Assert.False(Eval(Gen(1, plants), Uniform(2)).LooksStable);
    }

    [Fact]
    public void Colour_comparison_ignores_case_and_extra_spaces()
    {
        var plants = new[] { P(color: "Red"), P(color: "red"), P(color: " RED "), P(color: "red  "), P(color: "red") };
        Assert.True(Eval(Gen(1, plants), Uniform(2)).LooksStable);
    }

    [Fact]
    public void Two_uniform_generations_with_the_same_values_look_stable()
    {
        var r = Eval(Uniform(1), Uniform(2));
        Assert.True(r.LooksStable);
        Assert.Equal("looksStable", r.State);
        Assert.Equal(new[] { "F2", "F1" }, r.GenerationsJudged);
    }

    [Fact]
    public void Two_uniform_generations_with_different_values_do_not()
    {
        var other = Gen(2, Enumerable.Range(0, 5).Select(_ => P(color: "yellow")).ToArray());
        var r = Eval(Uniform(1), other);
        Assert.False(r.LooksStable);
        Assert.Equal("segregating", r.State);
    }

    [Fact]
    public void Only_the_newest_two_generations_are_judged()
    {
        var messy = Gen(1, P(), P(color: "x"), P(color: "y"), P(color: "z"));
        Assert.True(Eval(messy, Uniform(2), Uniform(3)).LooksStable);
    }

    [Fact]
    public void Samples_of_one_generation_are_merged_across_a_rename_chain()
    {
        // Roma-A F2 (3 plants) + Roma-Classic F2 (3 plants) together are uniform.
        var merged = Eval(Uniform(1), Uniform(2, 3), Uniform(2, 3));
        var single = Eval(Uniform(1), Uniform(2, 6));
        Assert.Equal(single.State, merged.State);
        Assert.True(merged.LooksStable);
    }

    [Fact]
    public void Chain_verdict_equals_old_line_verdict_before_new_plants()
    {
        var old = Eval(Uniform(1), Uniform(2));
        var branched = Eval(Uniform(1), Uniform(2)); // same merged samples, new line sees the chain
        Assert.Equal(old.State, branched.State);
        Assert.Equal(old.LooksStable, branched.LooksStable);
        Assert.Equal(old.GenerationsJudged, branched.GenerationsJudged);
    }

    [Fact]
    public void Founders_are_always_none()
    {
        var r = StabilityEvaluator.Evaluate(true, true, new[] { Uniform(1), Uniform(2) });
        Assert.Equal("none", r.State);
        Assert.False(r.LooksStable);
    }

    [Fact]
    public void Fewer_than_two_generations_is_none()
    {
        Assert.Equal("none", Eval(Uniform(1)).State);
        Assert.Equal("none", Eval().State);
    }

    [Fact]
    public void The_breeders_mark_wins_over_the_computed_state()
    {
        var r = StabilityEvaluator.Evaluate(false, true, new[] { Gen(1, P(), P(color: "x"), P(color: "y")), Uniform(2) });
        Assert.Equal("stable", r.State);
        Assert.False(r.LooksStable);
    }

    [Fact]
    public void Marked_line_with_one_generation_is_still_stable()
    {
        Assert.Equal("stable", StabilityEvaluator.Evaluate(false, true, new[] { Uniform(1) }).State);
    }
}
