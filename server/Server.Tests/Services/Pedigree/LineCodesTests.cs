using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services.Pedigree;

public class LineCodesTests
{
    [Theory]
    [InlineData("Roma-A", "RA")]
    [InlineData("Roma Classic", "RC")]
    [InlineData("Cherry Tomato Red", "CTR")]
    [InlineData("Very Long Name Of Words", "VLN")]
    public void Initials_of_the_words(string name, string expected) =>
        Assert.Equal(expected, LineCodes.From(name, Array.Empty<string>()));

    [Theory]
    [InlineData("Roma", "ROM")]
    [InlineData("Ab", "AB")]
    [InlineData("x", "X")]
    public void One_word_uses_its_first_letters(string name, string expected) =>
        Assert.Equal(expected, LineCodes.From(name, Array.Empty<string>()));

    [Theory]
    [InlineData("")]
    [InlineData("!!!")]
    [InlineData("שלום")]
    [InlineData(null)]
    public void Never_empty(string? name) =>
        Assert.Equal("L", LineCodes.From(name, Array.Empty<string>()));

    [Fact]
    public void Numeric_suffix_when_taken_case_insensitive()
    {
        Assert.Equal("RA2", LineCodes.From("Roma-A", new[] { "ra" }));
        Assert.Equal("RA3", LineCodes.From("Roma-A", new[] { "RA", "RA2" }));
    }

    [Fact]
    public void Founders_code_P_counts_as_taken_when_passed()
    {
        Assert.Equal("P2", LineCodes.From("P", new[] { "P" }));
    }

    [Fact]
    public void Stays_within_six_characters_with_a_long_suffix()
    {
        var taken = Enumerable.Range(2, 200).Select(n => "ROM" + n).Append("ROM").ToList();
        var code = LineCodes.From("Roma", taken);
        Assert.True(code.Length <= LineCodes.MaxLength);
        Assert.DoesNotContain(code, taken, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void Unique_per_project_for_many_similar_names()
    {
        var taken = new List<string>();
        for (var i = 0; i < 50; i++) taken.Add(LineCodes.From("Roma-A", taken));
        Assert.Equal(50, taken.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }
}
