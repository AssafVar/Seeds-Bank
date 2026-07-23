using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddFieldAgricultureData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "harvest_date",
                table: "fields",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "fields",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "sowing_date",
                table: "fields",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "fields",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<double>(
                name: "yield_amount",
                table: "fields",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "yield_unit",
                table: "fields",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "harvest_date",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "notes",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "sowing_date",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "status",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "yield_amount",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "yield_unit",
                table: "fields");
        }
    }
}
