using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:citext", ",,");

            migrationBuilder.CreateTable(
                name: "fields",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    project_id = table.Column<string>(type: "text", nullable: false),
                    parent_field_id = table.Column<int>(type: "integer", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    variety = table.Column<string>(type: "text", nullable: true),
                    shape_type = table.Column<string>(type: "text", nullable: false),
                    sowing_structure = table.Column<string>(type: "text", nullable: false),
                    vertices_json = table.Column<string>(type: "text", nullable: false),
                    land_width = table.Column<double>(type: "double precision", nullable: true),
                    land_length = table.Column<double>(type: "double precision", nullable: true),
                    plant_spacing = table.Column<double>(type: "double precision", nullable: true),
                    row_spacing = table.Column<double>(type: "double precision", nullable: true),
                    geo_vertices_json = table.Column<string>(type: "text", nullable: true),
                    origin_lat = table.Column<double>(type: "double precision", nullable: true),
                    origin_lng = table.Column<double>(type: "double precision", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    status = table.Column<string>(type: "text", nullable: true),
                    sowing_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    harvest_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    yield_amount = table.Column<double>(type: "double precision", nullable: true),
                    yield_unit = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fields", x => x.id);
                    table.ForeignKey(
                        name: "FK_fields_fields_parent_field_id",
                        column: x => x.parent_field_id,
                        principalTable: "fields",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "gallery_images",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_path = table.Column<string>(type: "text", nullable: false),
                    caption = table.Column<string>(type: "text", nullable: true),
                    uploaded_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gallery_images", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "news_posts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title = table.Column<string>(type: "text", nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_news_posts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    project_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    project_name = table.Column<string>(type: "text", nullable: false),
                    plant_type = table.Column<string>(type: "text", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    last_update = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.project_id);
                });

            migrationBuilder.CreateTable(
                name: "site_content",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    description = table.Column<string>(type: "text", nullable: true),
                    contact_email = table.Column<string>(type: "text", nullable: true),
                    contact_phone = table.Column<string>(type: "text", nullable: true),
                    contact_address = table.Column<string>(type: "text", nullable: true),
                    video_url = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_site_content", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    userId = table.Column<string>(type: "text", nullable: false),
                    userName = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "citext", nullable: false),
                    password = table.Column<string>(type: "text", nullable: false),
                    isAdmin = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.userId);
                });

            migrationBuilder.CreateTable(
                name: "vegetable_varieties",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    plant_spacing = table.Column<double>(type: "double precision", nullable: false),
                    row_spacing = table.Column<double>(type: "double precision", nullable: false),
                    water_mm_per_season = table.Column<double>(type: "double precision", nullable: false),
                    fertilizer_kg_per_100m2 = table.Column<double>(type: "double precision", nullable: false),
                    seed_buffer_percent = table.Column<double>(type: "double precision", nullable: false),
                    seed_unit = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vegetable_varieties", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "workers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: true),
                    hourly_rate = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lines",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    project_id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "citext", maxLength: 100, nullable: false),
                    code = table.Column<string>(type: "citext", maxLength: 6, nullable: false),
                    is_founders = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_stable = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    stable_marked_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    successor_line_id = table.Column<int>(type: "integer", nullable: true),
                    origin_note = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    next_seq = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lines", x => x.id);
                    table.CheckConstraint("CK_lines_code_length", "char_length(code) <= 6");
                    table.CheckConstraint("CK_lines_name_length", "char_length(name) <= 100");
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
                });

            migrationBuilder.CreateTable(
                name: "field_work_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    field_id = table.Column<int>(type: "integer", nullable: false),
                    worker_id = table.Column<int>(type: "integer", nullable: false),
                    work_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    hours_worked = table.Column<double>(type: "double precision", nullable: false),
                    hourly_rate_at_entry = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
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
                });

            migrationBuilder.CreateTable(
                name: "line_origins",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    line_id = table.Column<int>(type: "integer", nullable: false),
                    role = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    source_line_id = table.Column<int>(type: "integer", nullable: true),
                    source_line_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    source_label = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    source_plant_tag = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true)
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
                });

            migrationBuilder.CreateTable(
                name: "populations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    project_id = table.Column<string>(type: "text", nullable: false),
                    line_id = table.Column<int>(type: "integer", nullable: false),
                    kind = table.Column<char>(type: "character(1)", nullable: true),
                    generation = table.Column<int>(type: "integer", nullable: true),
                    season = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    year = table.Column<short>(type: "smallint", nullable: true),
                    field_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
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
                });

            migrationBuilder.CreateTable(
                name: "project_items",
                columns: table => new
                {
                    plant_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    project_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tag = table.Column<string>(type: "citext", maxLength: 40, nullable: false),
                    population_id = table.Column<int>(type: "integer", nullable: false),
                    plant_mother_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    plant_father_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    mother_removed_tag = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    father_removed_tag = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    fruit_color = table.Column<string>(type: "citext", nullable: true),
                    fruit_weight = table.Column<string>(type: "citext", nullable: true),
                    seed_color = table.Column<string>(type: "citext", nullable: true),
                    seed_weight = table.Column<string>(type: "citext", nullable: true),
                    row_version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_items", x => x.plant_id);
                    table.CheckConstraint("CK_project_items_tag_length", "char_length(tag) <= 40");
                    table.ForeignKey(
                        name: "FK_project_items_populations_population_id",
                        column: x => x.population_id,
                        principalTable: "populations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_project_items_project_items_plant_father_id",
                        column: x => x.plant_father_id,
                        principalTable: "project_items",
                        principalColumn: "plant_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_project_items_project_items_plant_mother_id",
                        column: x => x.plant_mother_id,
                        principalTable: "project_items",
                        principalColumn: "plant_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_project_items_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "project_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_field_work_logs_field_id",
                table: "field_work_logs",
                column: "field_id");

            migrationBuilder.CreateIndex(
                name: "IX_field_work_logs_worker_id",
                table: "field_work_logs",
                column: "worker_id");

            migrationBuilder.CreateIndex(
                name: "IX_fields_parent_field_id",
                table: "fields",
                column: "parent_field_id");

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
                name: "IX_project_items_project_id_tag",
                table: "project_items",
                columns: new[] { "project_id", "tag" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "field_work_logs");

            migrationBuilder.DropTable(
                name: "gallery_images");

            migrationBuilder.DropTable(
                name: "line_origins");

            migrationBuilder.DropTable(
                name: "news_posts");

            migrationBuilder.DropTable(
                name: "project_items");

            migrationBuilder.DropTable(
                name: "site_content");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "vegetable_varieties");

            migrationBuilder.DropTable(
                name: "workers");

            migrationBuilder.DropTable(
                name: "populations");

            migrationBuilder.DropTable(
                name: "fields");

            migrationBuilder.DropTable(
                name: "lines");

            migrationBuilder.DropTable(
                name: "projects");
        }
    }
}
