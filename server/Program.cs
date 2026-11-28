using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SeedsBank.Server.Data;
using SeedsBank.Server.Services;
using SeedsBank.Server.Services.Pedigree;

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
// No EnableRetryOnFailure: PlantService runs user-initiated transactions,
// which EF's retrying execution strategy refuses.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

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
    // The original client tolerated numeric-looking strings for
    // integer columns (e.g. editing the "generation" table cell); keep
    // that same leniency here instead of hard-rejecting the request.
    options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Fail fast on missing or unsafe configuration (after Build() so `dotnet ef` still works).
StartupChecks.Validate(app.Configuration, app.Environment.IsDevelopment());

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler(errorApp => errorApp.Run(GlobalExceptionHandler.HandleAsync));

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
