using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class TagFormatterTests
{
    [Fact]
    public void Formats_line_tags() => Assert.Equal("RA-F3-014", TagFormatter.Format("RA", false, 'F', 3, 14));

    [Fact]
    public void Formats_self_tags() => Assert.Equal("RA-S2-001", TagFormatter.Format("RA", false, 'S', 2, 1));

    [Fact]
    public void Founders_tags_have_no_label() => Assert.Equal("P-014", TagFormatter.Format("P", true, 'P', 0, 14));

    [Fact]
    public void Legacy_parentless_plant_in_a_named_line_is_labelled_P() =>
        Assert.Equal("RA-P-001", TagFormatter.Format("RA", false, 'P', 0, 1));

    [Fact]
    public void Padding_stops_at_three_digits_and_grows_past_999()
    {
        Assert.Equal("RA-F1-1000", TagFormatter.Format("RA", false, 'F', 1, 1000));
        Assert.Equal("RA-F1-099", TagFormatter.Format("RA", false, 'F', 1, 99));
    }

    [Theory]
    [InlineData('P', 0, "P")]
    [InlineData('F', 1, "F1")]
    [InlineData('S', 12, "S12")]
    [InlineData('F', 0, "F0")]
    [InlineData('P', 3, "P3")]
    public void Labels(char kind, int generation, string expected) =>
        Assert.Equal(expected, TagFormatter.Label(kind, generation));

    [Fact]
    public void NextFree_skips_taken_tags()
    {
        var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "RA-F1-001", "ra-f1-002" };
        var (tag, seq) = TagFormatter.NextFree("RA", false, 'F', 1, 1, taken.Contains);
        Assert.Equal("RA-F1-003", tag);
        Assert.Equal(3, seq);
    }

    [Theory]
    [InlineData("a.b_c-1", true)]
    [InlineData("A", true)]
    [InlineData("123456789012345678901234", true)]
    [InlineData("1234567890123456789012345", false)]
    [InlineData("", false)]
    [InlineData("a b", false)]
    [InlineData("a<b", false)]
    [InlineData("a​b", false)]
    [InlineData("abc\n", false)]
    [InlineData(null, false)]
    public void Custom_tag_format(string? tag, bool valid) => Assert.Equal(valid, InputRules.IsValidTag(tag));

    [Fact]
    public void Invalid_tag_throws_a_400_with_field_and_code()
    {
        var ex = Assert.Throws<PedigreeException>(() => InputRules.ValidateTag("a b"));
        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("tag", ex.Field);
        Assert.Equal("invalid_tag", ex.Code);
    }
}
