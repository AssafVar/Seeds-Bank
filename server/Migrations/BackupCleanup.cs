using System.Globalization;

namespace SeedsBank.Server.Migrations
{
    // The date logic of DropBreedingBackupStep1, kept out of the migration
    // class so it can be tested without EF Relational types.
    public static class BackupCleanup
    {
        // Release date (2026-11-27) + 30 days. Override with the environment
        // variable SEEDSBANK_BACKUP_DROP_AFTER (an ISO date, UTC).
        public static readonly DateTime DefaultDropAfterUtc = new(2026, 12, 27, 0, 0, 0, DateTimeKind.Utc);
        public const string DropAfterVariable = "SEEDSBANK_BACKUP_DROP_AFTER";

        public static DateTime DropAfterUtc()
        {
            var text = Environment.GetEnvironmentVariable(DropAfterVariable);
            return DateTime.TryParse(text, CultureInfo.InvariantCulture,
                DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var date)
                ? date
                : DefaultDropAfterUtc;
        }

        public static bool ShouldDrop(DateTime nowUtc, DateTime dropAfterUtc) => nowUtc >= dropAfterUtc;

        public static string[] UpStatements(DateTime nowUtc, DateTime dropAfterUtc) =>
            ShouldDrop(nowUtc, dropAfterUtc)
                ? new[] { "DROP TABLE IF EXISTS `project_items_backup_step1`;" }
                : Array.Empty<string>();
    }
}
