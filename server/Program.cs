using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SeedsBank.Server.Data;
using SeedsBank.Server.Hosting;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

var builder = WebApplication.CreateBuilder(args);

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

// Quotas and ancestor-walk caps for the breeding feature (section "Pedigree").
builder.Services.Configure<PedigreeOptions>(builder.Configuration.GetSection(PedigreeOptions.SectionName));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProjectsService, ProjectsService>();
builder.Services.AddScoped<ILineService, LineService>();
builder.Services.AddScoped<IPlantService, PlantService>();
builder.Services.AddScoped<ISiteContentService, SiteContentService>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddScoped<IFieldService, FieldService>();
builder.Services.AddScoped<IVegetableVarietyService, VegetableVarietyService>();
builder.Services.AddScoped<IWorkerService, WorkerService>();
builder.Services.AddScoped<IFieldWorkLogService, FieldWorkLogService>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    // The old MySQL-backed client tolerated numeric-looking strings for
    // integer columns (e.g. editing the "generation" table cell); keep
    // that same leniency here instead of hard-rejecting the request.
    options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString;
});
builder.Services.AddSameOriginHosting(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Proxy headers first, so everything below sees the real scheme and client IP.
app.UseSameOriginHostingPreAuth();
app.UseExceptionHandler(errorApp => errorApp.Run(GlobalExceptionHandler.HandleAsync));

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapSameOriginHosting();

app.Run();
