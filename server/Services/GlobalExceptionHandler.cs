using Microsoft.AspNetCore.Diagnostics;
using SeedsBank.Server.Services.Pedigree;

namespace SeedsBank.Server.Services;

// The last-resort error answer. A PedigreeException that slipped past a
// controller still gets its { message, field, code } answer, and is logged by
// code only: its message holds tags the caller sent. Everything else is a
// generic 500 (the exception goes to the log, never to the client).
public static class GlobalExceptionHandler
{
    public static async Task HandleAsync(HttpContext context)
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        context.Response.ContentType = "application/json";

        if (error is PedigreeException pedigree)
        {
            logger.LogWarning("Pedigree rule {Code} escaped a controller on {Path}", pedigree.Code, context.Request.Path.Value);
            context.Response.StatusCode = pedigree.StatusCode;
            await context.Response.WriteAsJsonAsync(new { message = pedigree.Message, field = pedigree.Field, code = pedigree.Code });
            return;
        }

        if (error is not null)
        {
            logger.LogError(error, "Unhandled exception on {Path}", context.Request.Path.Value);
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
    }
}
