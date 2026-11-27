using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class InputRulesTests
{
    [Theory]
    [InlineData("Roma-A")]
    [InlineData("  Roma 2  ")]
    [InlineData("Müller")]
    [InlineData("שלום")]
    public void Line_name_accepts_letters_numbers_dash_space(string name) =>
        Assert.Equal(name.Trim(), InputRules.ValidateLineName(name));

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("Ro​ma")]          // zero-width space
    [InlineData("Ro‮ma")]          // bidi override
    [InlineData("Ro\tma")]
    [InlineData("Ro\nma")]
    [InlineData("Roma.A")]
    [InlineData("Roma_A")]
    [InlineData("<b>x</b>")]
    public void Line_name_rejects_bad_characters(string? name)
    {
        var ex = Assert.Throws<PedigreeException>(() => InputRules.ValidateLineName(name));
        Assert.Equal("invalid_line_name", ex.Code);
        Assert.Equal("lineName", ex.Field);
    }

    [Fact]
    public void Line_name_length_40_ok_41_rejected()
    {
        Assert.Equal(40, InputRules.ValidateLineName(new string('a', 40)).Length);
        Assert.Throws<PedigreeException>(() => InputRules.ValidateLineName(new string('a', 41)));
    }

    [Fact]
    public void Origin_note_length_and_characters()
    {
        Assert.Null(InputRules.ValidateOriginNote("   "));
        Assert.Equal(200, InputRules.ValidateOriginNote(new string('a', 200))!.Length);
        Assert.Throws<PedigreeException>(() => InputRules.ValidateOriginNote(new string('a', 201)));
        Assert.Throws<PedigreeException>(() => InputRules.ValidateOriginNote("a\nb"));
        Assert.Throws<PedigreeException>(() => InputRules.ValidateOriginNote("a​b"));
    }

    [Fact]
    public void Trait_is_trimmed_empty_becomes_null_and_bounded()
    {
        Assert.Equal("red", InputRules.NormalizeTrait("fruitColor", "  red "));
        Assert.Null(InputRules.NormalizeTrait("fruitColor", "   "));
        Assert.Null(InputRules.NormalizeTrait("fruitColor", null));
        var ex = Assert.Throws<PedigreeException>(() => InputRules.NormalizeTrait("fruitColor", new string('a', 201)));
        Assert.Equal("fruitColor", ex.Field);
        Assert.Throws<PedigreeException>(() => InputRules.NormalizeTrait("seedColor", "a\u0007b"));
    }

    [Fact]
    public void Season_and_year()
    {
        Assert.Equal("Spring", InputRules.ValidateSeason("Spring"));
        Assert.Null(InputRules.ValidateSeason(null));
        Assert.Throws<PedigreeException>(() => InputRules.ValidateSeason("spring"));
        Assert.Throws<PedigreeException>(() => InputRules.ValidateSeason("Monsoon"));
        Assert.Equal((short)2026, InputRules.ValidateYear(2026));
        Assert.Null(InputRules.ValidateYear(null));
        Assert.Throws<PedigreeException>(() => InputRules.ValidateYear(1899));
        Assert.Throws<PedigreeException>(() => InputRules.ValidateYear(2101));
    }

    [Fact]
    public void Search_over_100_characters_is_400()
    {
        Assert.Equal(100, InputRules.ValidateSearch(new string('a', 100))!.Length);
        var ex = Assert.Throws<PedigreeException>(() => InputRules.ValidateSearch(new string('a', 101)));
        Assert.Equal(400, ex.StatusCode);
        Assert.Null(InputRules.ValidateSearch("  "));
    }

    [Fact]
    public void Like_pattern_escapes_wildcards_so_they_match_literally()
    {
        Assert.Equal("%50\\%\\_a\\\\b%", InputRules.LikeContains("50%_a\\b"));
    }

    [Fact]
    public void Paging_is_clamped_and_skip_cannot_overflow()
    {
        Assert.Equal((1, 25, 0L), InputRules.ClampPaging(0, 25));
        Assert.Equal((1, 1, 0L), InputRules.ClampPaging(-5, -5));
        Assert.Equal(100, InputRules.ClampPaging(1, 5000).PageSize);
        var huge = InputRules.ClampPaging(int.MaxValue, 100);
        Assert.Equal(100_000, huge.Page);
        Assert.Equal(99_999L * 100, huge.Skip);
    }
}
