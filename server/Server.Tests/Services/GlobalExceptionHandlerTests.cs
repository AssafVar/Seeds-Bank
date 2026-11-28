using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Tests.Services;

// Log hygiene (threat model C-LOG): a PedigreeException message holds tags
// the caller sent, so it is never handed to the logger.
public class GlobalExceptionHandlerTests
{
    private sealed class Spy<T> : ILogger<T>
    {
        public List<string> Messages { get; } = new();
        public List<Exception> Exceptions { get; } = new();
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Messages.Add(formatter(state, exception));
            if (exception is not null) Exceptions.Add(exception);
        }
    }

    private sealed class Feature : IExceptionHandlerFeature
    {
        public Exception Error { get; init; } = null!;
        public string Path { get; init; } = "/";
        public Microsoft.AspNetCore.Http.Endpoint? Endpoint => null;
        public Microsoft.AspNetCore.Routing.RouteValueDictionary? RouteValues => null;
    }

    private static async Task<(int Status, string Body, Spy<Program> Log)> RunAsync(Exception error)
    {
        var spy = new Spy<Program>();
        var context = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddSingleton<ILogger<Program>>(spy).BuildServiceProvider(),
        };
        context.Request.Path = "/api/projects/u1/p1/plants";
        context.Features.Set<IExceptionHandlerFeature>(new Feature { Error = error });
        var body = new MemoryStream();
        context.Response.Body = body;

        await GlobalExceptionHandler.HandleAsync(context);

        return (context.Response.StatusCode, System.Text.Encoding.UTF8.GetString(body.ToArray()), spy);
    }

    [Fact]
    public async Task A_PedigreeException_that_escapes_is_answered_in_shape_and_logged_by_code_only()
    {
        var (status, body, log) = await RunAsync(new PedigreeException("tag", "tag_taken", "The tag SECRET-TAG-9 is already used in this project.", 409));

        Assert.Equal(409, status);
        using var json = JsonDocument.Parse(body);
        Assert.Equal("tag_taken", json.RootElement.GetProperty("code").GetString());
        Assert.Equal("tag", json.RootElement.GetProperty("field").GetString());
        Assert.Contains("SECRET-TAG-9", json.RootElement.GetProperty("message").GetString());
        Assert.NotEmpty(log.Messages);
        Assert.All(log.Messages, m => Assert.DoesNotContain("SECRET-TAG-9", m));
        Assert.Contains(log.Messages, m => m.Contains("tag_taken"));
        Assert.Empty(log.Exceptions);
    }

    [Fact]
    public async Task Any_other_exception_is_a_generic_500_and_its_text_stays_out_of_the_answer()
    {
        var (status, body, log) = await RunAsync(new InvalidOperationException("Duplicate entry 'SECRET' INSERT INTO"));

        Assert.Equal(500, status);
        Assert.Equal("An unexpected error occurred.", JsonDocument.Parse(body).RootElement.GetProperty("message").GetString());
        Assert.DoesNotContain("SECRET", body);
        Assert.Single(log.Exceptions);
    }

    [Fact]
    public void The_new_services_and_controllers_take_no_logger_so_they_cannot_log_tags_or_bodies()
    {
        var types = new[]
        {
            typeof(PlantService), typeof(LineService), typeof(ProjectsService),
            typeof(SeedsBank.Server.Controllers.PlantsController), typeof(SeedsBank.Server.Controllers.LinesController),
            typeof(SeedsBank.Server.Controllers.PopulationsController),
        };

        foreach (var type in types)
        {
            Assert.DoesNotContain(type.GetConstructors().Single().GetParameters(),
                p => p.ParameterType.Name.StartsWith("ILogger"));
        }
    }
}
