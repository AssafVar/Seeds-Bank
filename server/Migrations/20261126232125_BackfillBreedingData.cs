using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    public partial class BackfillBreedingData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var sql in BreedingMigrationSql.BackfillUp)
            {
                migrationBuilder.Sql(sql);
            }
        }

        /// <inheritdoc />
        // Lossy: tags, removed-parent markers, stable marks, season and place,
        // rename chains, line origins and anything created after Up are lost,
        // and plants removed as orphans are NOT restored (they exist only in
        // project_items_backup_step1). Do not run in production without that backup.
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var sql in BreedingMigrationSql.BackfillDown)
            {
                migrationBuilder.Sql(sql);
            }
        }
    }
}
