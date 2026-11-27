using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class FinalizeBreedingSchema : Migration
    {
        /// <inheritdoc />
        // M-C is the point of no return (it drops line, generation and
        // project_name). The gate runs first and aborts unless every invariant
        // holds, the orphan count matches what M-B logged and the backup table
        // exists.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(BreedingMigrationSql.GateSql());

            migrationBuilder.DropIndex(
                name: "IX_project_items_project_id",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "generation",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "line",
                table: "project_items");

            migrationBuilder.DropColumn(
                name: "project_name",
                table: "project_items");

            migrationBuilder.UpdateData(
                table: "project_items",
                keyColumn: "tag",
                keyValue: null,
                column: "tag",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "tag",
                table: "project_items",
                type: "varchar(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(40)",
                oldMaxLength: 40,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "population_id",
                table: "project_items",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_items_project_id_tag",
                table: "project_items",
                columns: new[] { "project_id", "tag" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_project_items_populations_population_id",
                table: "project_items",
                column: "population_id",
                principalTable: "populations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_project_items_project_items_plant_father_id",
                table: "project_items",
                column: "plant_father_id",
                principalTable: "project_items",
                principalColumn: "plant_id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_project_items_project_items_plant_mother_id",
                table: "project_items",
                column: "plant_mother_id",
                principalTable: "project_items",
                principalColumn: "plant_id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_project_items_projects_project_id",
                table: "project_items",
                column: "project_id",
                principalTable: "projects",
                principalColumn: "project_id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_project_items_populations_population_id",
                table: "project_items");

            migrationBuilder.DropForeignKey(
                name: "FK_project_items_project_items_plant_father_id",
                table: "project_items");

            migrationBuilder.DropForeignKey(
                name: "FK_project_items_project_items_plant_mother_id",
                table: "project_items");

            migrationBuilder.DropForeignKey(
                name: "FK_project_items_projects_project_id",
                table: "project_items");

            migrationBuilder.DropIndex(
                name: "IX_project_items_project_id_tag",
                table: "project_items");

            migrationBuilder.AlterColumn<string>(
                name: "tag",
                table: "project_items",
                type: "varchar(40)",
                maxLength: 40,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(40)",
                oldMaxLength: 40)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "population_id",
                table: "project_items",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "generation",
                table: "project_items",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "line",
                table: "project_items",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "project_name",
                table: "project_items",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_project_items_project_id",
                table: "project_items",
                column: "project_id");
        }
    }
}
