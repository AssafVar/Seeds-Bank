using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddFieldHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<double>(
                name: "row_spacing",
                table: "fields",
                type: "double",
                nullable: true,
                oldClrType: typeof(double),
                oldType: "double");

            migrationBuilder.AlterColumn<double>(
                name: "plant_spacing",
                table: "fields",
                type: "double",
                nullable: true,
                oldClrType: typeof(double),
                oldType: "double");

            migrationBuilder.AddColumn<string>(
                name: "geo_vertices_json",
                table: "fields",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<double>(
                name: "origin_lat",
                table: "fields",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "origin_lng",
                table: "fields",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "parent_field_id",
                table: "fields",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_fields_parent_field_id",
                table: "fields",
                column: "parent_field_id");

            migrationBuilder.AddForeignKey(
                name: "FK_fields_fields_parent_field_id",
                table: "fields",
                column: "parent_field_id",
                principalTable: "fields",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_fields_fields_parent_field_id",
                table: "fields");

            migrationBuilder.DropIndex(
                name: "IX_fields_parent_field_id",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "geo_vertices_json",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "origin_lat",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "origin_lng",
                table: "fields");

            migrationBuilder.DropColumn(
                name: "parent_field_id",
                table: "fields");

            migrationBuilder.AlterColumn<double>(
                name: "row_spacing",
                table: "fields",
                type: "double",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "double",
                oldNullable: true);

            migrationBuilder.AlterColumn<double>(
                name: "plant_spacing",
                table: "fields",
                type: "double",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "double",
                oldNullable: true);
        }
    }
}
