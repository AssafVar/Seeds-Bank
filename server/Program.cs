using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SeedsBank.Server.Data;
using SeedsBank.Server.Services;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "ClientCorsPolicy";

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var connectionString = builder.Configuration.GetConnectionString("Default");
// Pinned rather than ServerVersion.AutoDetect: auto-detect opens a blocking
// DB connection during startup (and during EF tooling like `dotnet ef
// migrations add`) just to sniff the server version. Bump this if your
// MySQL server is on a materially different 8.x version.
var mySqlServerVersion = new MySqlServerVersion(new Version(8, 0, 34));
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, mySqlServerVersion));

var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!)),
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("isAdmin", "true"));
});

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProjectsService, ProjectsService>();
builder.Services.AddScoped<ISiteContentService, SiteContentService>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    // The old MySQL-backed client tolerated numeric-looking strings for
    // integer columns (e.g. editing the "generation" table cell); keep
    // that same leniency here instead of hard-rejecting the request.
    options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        if (feature is not null)
        {
            context.RequestServices.GetRequiredService<ILogger<Program>>()
                .LogError(feature.Error, "Unhandled exception on {Path}", context.Request.Path);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Response from server");
app.MapControllers();

app.Run();
