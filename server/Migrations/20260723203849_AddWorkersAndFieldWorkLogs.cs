using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkersAndFieldWorkLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "workers",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    role = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    hourly_rate = table.Column<double>(type: "double", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workers", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "field_work_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    field_id = table.Column<int>(type: "int", nullable: false),
                    worker_id = table.Column<int>(type: "int", nullable: false),
                    work_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    hours_worked = table.Column<double>(type: "double", nullable: false),
                    hourly_rate_at_entry = table.Column<double>(type: "double", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_field_work_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_field_work_logs_fields_field_id",
                        column: x => x.field_id,
                        principalTable: "fields",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_field_work_logs_workers_worker_id",
                        column: x => x.worker_id,
                        principalTable: "workers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_field_work_logs_field_id",
                table: "field_work_logs",
                column: "field_id");

            migrationBuilder.CreateIndex(
                name: "IX_field_work_logs_worker_id",
                table: "field_work_logs",
                column: "worker_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "field_work_logs");

            migrationBuilder.DropTable(
                name: "workers");
        }
    }
}
