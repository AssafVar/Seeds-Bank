using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeedsBank.Server.Migrations
{
    /// <inheritdoc />
    // Drops project_items_backup_step1 (a copy of every user's plants outside
    // the app's access rules) once the retention period is over. Before the
    // cut-off date it does nothing.
    //
    // CAVEAT: EF records a migration as applied the first time it runs. If
    // this runs before the date it is a no-op and is then marked done, so the
    // table is NOT dropped later. Apply this migration only on or after the
    // date (or drop the table by hand). The date is decided when the
    // migration runs (also when a script is generated, so do not bake an
    // idempotent script earlier than the date).
    public partial class DropBreedingBackupStep1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var sql in BackupCleanup.UpStatements(DateTime.UtcNow, BackupCleanup.DropAfterUtc()))
            {
                migrationBuilder.Sql(sql);
            }
        }

        /// <inheritdoc />
        // The dropped copy cannot be restored.
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
