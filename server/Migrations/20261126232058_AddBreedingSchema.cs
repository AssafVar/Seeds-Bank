using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddBreedingSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Safety copy of every plant, taken once. IF NOT EXISTS means a
            // re-run after users created plants never overwrites it. It holds
            // every user's pedigree outside the app's access rules, so a separate
            // migration added after 2026-12-27 removes it. Down does NOT drop it.
            migrationBuilder.Sql("CREATE TABLE IF NOT EXISTS project_items_backup_step1 AS SELECT * FROM project_items;");

            // Counts only, never row data. One row per step; M-B adds the orphan count.
            migrationBuilder.Sql(@"CREATE TABLE IF NOT EXISTS breeding_migration_log (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                step VARCHAR(40) NOT NULL,
                row_count INT NOT NULL,
                logged_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE KEY ux_breeding_migration_log_step (step)
            );");
            migrationBuilder.Sql("INSERT IGNORE INTO breeding_migration_log (step, row_count) SELECT 'backup_rows', COUNT(*) FROM project_items_backup_step1;");
            migrationBuilder.Sql("INSERT IGNORE INTO breeding_migration_log (step, row_count) SELECT 'backup_orphan_rows', COUNT(*) FROM project_items_backup_step1 b WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.project_id = b.project_id);");

            migrationBuilder.AlterColumn<string>(
                name: "seed_weight",
                table: "project_items",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "seed_color",
                table: "project_items",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "project_name",
                table: "project_items",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "project_id",
                table: "project_items",
                type: "varchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "plant_mother_id",
                table: "project_items",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "plant_father_id",
                table: "project_items",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "line",
                table: "project_items",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "generation",
                table: "project_items",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "fruit_weight",
                table: "project_items",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "fruit_color",
                table: "project_items",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "project_items",
                type: "datetime(6)",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP(6)");

            migrationBuilder.AddColumn<string>(
                name: "father_removed_tag",
                table: "project_items",
                type: "varchar(40)",
                maxLength: 40,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "mother_removed_tag",
                table: "project_items",
                type: "varchar(40)",
                maxLength: 40,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "population_id",
                table: "project_items",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "row_version",
                table: "project_items",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "tag",
                table: "project_items",
                type: "varchar(40)",
                maxLength: 40,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "lines",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    project_id = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    code = table.Column<string>(type: "varchar(6)", maxLength: 6, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_founders = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    is_stable = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    stable_marked_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    successor_line_id = table.Column<int>(type: "int", nullable: true),
                    origin_note = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    next_seq = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_lines_lines_successor_line_id",
                        column: x => x.successor_line_id,
                        principalTable: "lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_lines_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "project_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "line_origins",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    line_id = table.Column<int>(type: "int", nullable: false),
                    role = table.Column<string>(type: "varchar(12)", maxLength: 12, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    source_line_id = table.Column<int>(type: "int", nullable: true),
                    source_line_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    source_label = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    source_plant_tag = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_line_origins", x => x.id);
                    table.ForeignKey(
                        name: "FK_line_origins_lines_line_id",
                        column: x => x.line_id,
                        principalTable: "lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_line_origins_lines_source_line_id",
                        column: x => x.source_line_id,
                        principalTable: "lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "populations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    project_id = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    line_id = table.Column<int>(type: "int", nullable: false),
                    kind = table.Column<string>(type: "char(1)", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    generation = table.Column<int>(type: "int", nullable: true),
                    season = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    year = table.Column<short>(type: "smallint", nullable: true),
                    field_id = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_populations", x => x.id);
                    table.ForeignKey(
                        name: "FK_populations_fields_field_id",
                        column: x => x.field_id,
                        principalTable: "fields",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_populations_lines_line_id",
                        column: x => x.line_id,
                        principalTable: "lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_populations_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "project_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_project_items_plant_father_id",
                table: "project_items",
                column: "plant_father_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_items_plant_mother_id",
                table: "project_items",
                column: "plant_mother_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_items_population_id",
                table: "project_items",
                column: "population_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_items_project_id",
                table: "project_items",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "IX_line_origins_line_id",
                table: "line_origins",
                column: "line_id");

            migrationBuilder.CreateIndex(
                name: "IX_line_origins_source_line_id",
                table: "line_origins",
                column: "source_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_lines_project_id_code",
                table: "lines",
                columns: new[] { "project_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lines_project_id_name",
                table: "lines",
                columns: new[] { "project_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lines_successor_line_id",
                table: "lines",
                column: "successor_line_id");

            migrationBuilder.CreateIndex(
                name: "IX_populations_field_id",
                table: "populations",
                column: "field_id");

            migrationBuilder.CreateIndex(
                name: "IX_populations_line_id_kind_generation_season_year_field_id",
                table: "populations",
                columns: new[] { "line_id", "kind", "generation", "season", "year", "field_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_populations_project_id",
                table: "populations",
                column: "project_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "line_origins");

            migrationBuilder.DropTable(
                name: "populations");

            migrationBuilder.DropTable(
                name: "lines");

            migrationBuilder.DropIndex(
                name: "IX_project_items_plant_father_id",
                table: "project_items");

            migrationBuilder.DropIndex(
                name: "IX_project_items_plant_mother_id",
                table: "project_items");

            migrationBuilder.DropIndex(
                name: "IX_project_items_population_id",
                table: "project_items");

            migrationBuilder.DropIndex(
                name: "IX_project_items_project_id",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "father_removed_tag",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "mother_removed_tag",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "population_id",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "row_version",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "tag",
                table: "project_items");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "seed_weight",
                keyValue: null,
                column: "seed_weight",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "seed_weight",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "seed_color",
                keyValue: null,
                column: "seed_color",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "seed_color",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "project_name",
                keyValue: null,
                column: "project_name",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "project_name",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "project_id",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldMaxLength: 255)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "plant_mother_id",
                keyValue: null,
                column: "plant_mother_id",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "plant_mother_id",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldMaxLength: 255,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "plant_father_id",
                keyValue: null,
                column: "plant_father_id",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "plant_father_id",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldMaxLength: 255,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "line",
                keyValue: null,
                column: "line",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "line",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "generation",
                table: "project_items",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "fruit_weight",
                keyValue: null,
                column: "fruit_weight",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "fruit_weight",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "fruit_color",
                keyValue: null,
                column: "fruit_color",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "fruit_color",
                table: "project_items",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            // Put the legacy columns back exactly as legacy-schema.sql has
            // them: no DEFAULT on generation, no explicit charset/collation
            // (they follow the table), and the original column order (M-C's
            // Down re-adds line, generation and project_name at the end).
            foreach (var sql in LegacyColumnRestore)
            {
                migrationBuilder.Sql(sql);
            }
        }

        private static readonly string[] LegacyColumnRestore =
        {
            "ALTER TABLE `project_items` MODIFY `project_id` longtext NOT NULL AFTER `plant_id`;",
            "ALTER TABLE `project_items` MODIFY `project_name` longtext NOT NULL AFTER `project_id`;",
            "ALTER TABLE `project_items` MODIFY `line` longtext NOT NULL AFTER `project_name`;",
            "ALTER TABLE `project_items` MODIFY `plant_father_id` longtext NOT NULL AFTER `line`;",
            "ALTER TABLE `project_items` MODIFY `plant_mother_id` longtext NOT NULL AFTER `plant_father_id`;",
            "ALTER TABLE `project_items` MODIFY `fruit_color` longtext NOT NULL AFTER `plant_mother_id`;",
            "ALTER TABLE `project_items` MODIFY `fruit_weight` longtext NOT NULL AFTER `fruit_color`;",
            "ALTER TABLE `project_items` MODIFY `seed_color` longtext NOT NULL AFTER `fruit_weight`;",
            "ALTER TABLE `project_items` MODIFY `seed_weight` longtext NOT NULL AFTER `seed_color`;",
            "ALTER TABLE `project_items` MODIFY `generation` int NOT NULL AFTER `seed_weight`;",
        };
    }
}
