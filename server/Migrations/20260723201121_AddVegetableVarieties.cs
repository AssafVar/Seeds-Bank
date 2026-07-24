using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddVegetableVarieties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vegetable_varieties",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    plant_spacing = table.Column<double>(type: "double", nullable: false),
                    row_spacing = table.Column<double>(type: "double", nullable: false),
                    water_mm_per_season = table.Column<double>(type: "double", nullable: false),
                    fertilizer_kg_per_100m2 = table.Column<double>(type: "double", nullable: false),
                    seed_buffer_percent = table.Column<double>(type: "double", nullable: false),
                    seed_unit = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vegetable_varieties", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // Seeds the same 15 entries that used to live in the client's
            // hardcoded vegetableVarieties.js, so behavior is unchanged
            // immediately after this ships - no empty dropdown on first
            // deploy.
            var seededAt = new DateTime(2026, 7, 23, 0, 0, 0, DateTimeKind.Utc);
            migrationBuilder.InsertData(
                table: "vegetable_varieties",
                columns: new[]
                {
                    "name", "plant_spacing", "row_spacing", "water_mm_per_season",
                    "fertilizer_kg_per_100m2", "seed_buffer_percent", "seed_unit", "created_at",
                },
                values: new object[,]
                {
                    { "Tomato", 0.45, 0.9, 500.0, 5.0, 0.1, "seeds", seededAt },
                    { "Pepper", 0.4, 0.6, 450.0, 4.0, 0.1, "seeds", seededAt },
                    { "Cucumber", 0.3, 1.2, 500.0, 4.0, 0.15, "seeds", seededAt },
                    { "Lettuce", 0.25, 0.3, 300.0, 2.0, 0.2, "seeds", seededAt },
                    { "Carrot", 0.05, 0.3, 350.0, 2.5, 0.35, "seeds", seededAt },
                    { "Onion", 0.1, 0.3, 350.0, 3.0, 0.3, "seeds", seededAt },
                    { "Potato", 0.3, 0.75, 450.0, 4.0, 0.05, "seed potatoes", seededAt },
                    { "Squash", 0.6, 1.2, 500.0, 4.0, 0.15, "seeds", seededAt },
                    { "Broccoli", 0.45, 0.6, 400.0, 4.0, 0.1, "seeds", seededAt },
                    { "Cabbage", 0.45, 0.6, 400.0, 4.0, 0.1, "seeds", seededAt },
                    { "Spinach", 0.1, 0.3, 300.0, 2.5, 0.25, "seeds", seededAt },
                    { "Beans (bush)", 0.15, 0.6, 350.0, 2.0, 0.15, "seeds", seededAt },
                    { "Eggplant", 0.45, 0.75, 500.0, 4.0, 0.1, "seeds", seededAt },
                    { "Corn", 0.25, 0.75, 450.0, 3.5, 0.15, "seeds", seededAt },
                    { "Watermelon", 0.9, 1.8, 550.0, 4.0, 0.15, "seeds", seededAt },
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vegetable_varieties");
        }
    }
}
