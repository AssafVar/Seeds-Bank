namespace SeedsBank.Server.Migrations
{
    // SQL for the three breeding migrations (AddBreedingSchema,
    // BackfillBreedingData, FinalizeBreedingSchema). Kept in one place so the
    // M-C gate and the local MySQL check script (Server.Tests/Fixtures) use
    // the very same invariant queries.
    //
    // Rules for every statement here: project_id appears in every GROUP BY,
    // PARTITION BY, join and NOT EXISTS; plants are attached to a project by
    // exact project_id match only; rows that match no project are removed from
    // project_items and survive only in project_items_backup_step1.
    public static class BreedingMigrationSql
    {
        // A value is "blank" when NULL, empty, whitespace-only or the legacy "---".
        private static string Blank(string column) =>
            $"({column} IS NULL OR {column} REGEXP '^[[:space:]]*(---)?[[:space:]]*$')";

        private static string NullIfBlank(string column) =>
            $"CASE WHEN {Blank(column)} THEN NULL ELSE {column} END";

        public static readonly string[] DropTempTables =
        {
            "DROP TABLE IF EXISTS tmp_breeding_seq;",
            "DROP TABLE IF EXISTS tmp_breeding_plants;",
            "DROP TABLE IF EXISTS tmp_breeding_line_names;",
        };

        // M-B Up, in order. Every statement is guarded (IS NULL / NOT EXISTS)
        // so running the migration twice creates nothing twice and never
        // lowers lines.next_seq.
        public static readonly string[] BackfillUp = BuildBackfillUp();

        private static string[] BuildBackfillUp()
        {
            var list = new List<string>();
            list.AddRange(DropTempTables);

            // 1. Orphans: plants whose project_id is not a project. Count first
            // (first value wins), then remove. They stay in the backup table.
            list.Add("""
                INSERT IGNORE INTO breeding_migration_log (step, row_count)
                SELECT 'orphans_removed', COUNT(*) FROM project_items i
                WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.project_id = i.project_id);
                """);
            list.Add("""
                DELETE FROM project_items
                WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.project_id = project_items.project_id);
                """);

            // 2. Normalise: "---", empty and whitespace-only become NULL.
            list.Add($"""
                UPDATE project_items SET
                    plant_mother_id = {NullIfBlank("plant_mother_id")},
                    plant_father_id = {NullIfBlank("plant_father_id")},
                    fruit_color = {NullIfBlank("fruit_color")},
                    fruit_weight = {NullIfBlank("fruit_weight")},
                    seed_color = {NullIfBlank("seed_color")},
                    seed_weight = {NullIfBlank("seed_weight")}
                WHERE {Blank("plant_mother_id")} OR {Blank("plant_father_id")} OR {Blank("fruit_color")}
                   OR {Blank("fruit_weight")} OR {Blank("seed_color")} OR {Blank("seed_weight")};
                """);

            // 3. Parent integrity, before lines and populations: a parent id that
            // is not a plant of the SAME project (this also drops every
            // reference into another project or user) or is the row itself
            // becomes NULL with removed tag '(unknown)'.
            foreach (var (parent, marker) in new[] { ("plant_mother_id", "mother_removed_tag"), ("plant_father_id", "father_removed_tag") })
            {
                list.Add($"""
                    UPDATE project_items c
                    LEFT JOIN project_items p ON p.plant_id = c.{parent} AND p.project_id = c.project_id
                    SET c.{parent} = NULL, c.{marker} = '(unknown)'
                    WHERE c.{parent} IS NOT NULL AND (p.plant_id IS NULL OR c.{parent} = c.plant_id);
                    """);
            }

            // 4. Founders: one line per project, including projects with no plants.
            list.Add("""
                INSERT INTO `lines` (project_id, name, code, is_founders, is_stable, next_seq, created_at)
                SELECT p.project_id, 'Founders', 'P', 1, 0, 1, UTC_TIMESTAMP(6) FROM projects p
                WHERE NOT EXISTS (SELECT 1 FROM `lines` l WHERE l.project_id = p.project_id AND l.is_founders = 1);
                """);

            // 5a. Plants still to place (population_id IS NULL): kind, bucket, trimmed line name.
            list.Add($"""
                CREATE TABLE tmp_breeding_plants AS
                SELECT i.plant_id, i.project_id,
                    COALESCE(i.generation, 0) AS generation,
                    CASE WHEN i.plant_mother_id IS NULL AND i.plant_father_id IS NULL THEN 'P'
                         WHEN i.plant_mother_id = i.plant_father_id THEN 'S'
                         ELSE 'F' END AS kind,
                    CASE WHEN {Blank("i.line")} THEN
                            CASE WHEN i.plant_mother_id IS NULL AND i.plant_father_id IS NULL AND COALESCE(i.generation, 0) = 0
                                 THEN 'founders' ELSE 'unnamed' END
                         ELSE 'named' END AS bucket,
                    TRIM(i.line) AS lname,
                    CAST(NULL AS SIGNED) AS line_id
                FROM project_items i
                WHERE i.population_id IS NULL;
                """);

            // 5b. One name per (project, trimmed name, case-insensitive): the
            // variant with the most plants (ties: lowest plant_id), cut to 100.
            // Grouping always includes project_id; the same name in two projects
            // stays two lines. A legacy line called Founders gets "(legacy)".
            list.Add("""
                CREATE TABLE tmp_breeding_line_names AS
                SELECT project_id, lkey, final_name FROM (
                    SELECT v.project_id, v.lname AS lkey,
                        CASE WHEN LOWER(v.display) = 'founders' THEN CONCAT(LEFT(v.display, 90), ' (legacy)')
                             ELSE LEFT(v.display, 100) END AS final_name,
                        ROW_NUMBER() OVER (PARTITION BY v.project_id, v.lname ORDER BY v.cnt DESC, v.min_id) AS rn
                    FROM (
                        SELECT project_id, lname, lname COLLATE utf8mb4_bin AS display, COUNT(*) AS cnt, MIN(plant_id) AS min_id
                        FROM tmp_breeding_plants WHERE bucket = 'named'
                        GROUP BY project_id, lname, lname COLLATE utf8mb4_bin
                    ) v
                ) x WHERE rn = 1
                UNION ALL
                SELECT project_id, '(unnamed)', '(unnamed)' FROM tmp_breeding_plants WHERE bucket = 'unnamed'
                GROUP BY project_id;
                """);

            // 5c. Lines. Code: initials of the words (one word: its first 3
            // letters), ASCII letters/digits only, "L" when nothing is left;
            // made unique per project by a numeric suffix (the Founders code P
            // counts as taken). Mirrors LineCodes.From.
            list.Add("""
                INSERT INTO `lines` (project_id, name, code, is_founders, is_stable, next_seq, created_at)
                SELECT c.project_id, c.final_name,
                    CASE WHEN c.n = 1 THEN c.base_code
                         ELSE CONCAT(LEFT(c.base_code, 6 - CHAR_LENGTH(CAST(c.n AS CHAR))), c.n) END,
                    0, 0, 1, UTC_TIMESTAMP(6)
                FROM (
                    SELECT b.project_id, b.final_name, b.base_code,
                        ROW_NUMBER() OVER (PARTITION BY b.project_id, b.base_code ORDER BY b.final_name COLLATE utf8mb4_bin)
                            + CASE WHEN b.base_code = 'P' THEN 1 ELSE 0 END AS n
                    FROM (
                        SELECT w.project_id, w.final_name,
                            CASE WHEN w.alnum = '' THEN 'L'
                                 WHEN CHAR_LENGTH(w.initials) >= 2 THEN LEFT(w.initials, 3)
                                 ELSE LEFT(w.alnum, 3) END AS base_code
                        FROM (
                            SELECT n.project_id, n.final_name,
                                REGEXP_REPLACE(UPPER(n.final_name), '[^A-Z0-9]', '', 1, 0, 'c') AS alnum,
                                REGEXP_REPLACE(
                                    REGEXP_REPLACE(UPPER(n.final_name), '[^A-Z0-9]*([A-Z0-9])[A-Z0-9]*', '$1', 1, 0, 'c'),
                                    '[^A-Z0-9]', '', 1, 0, 'c') AS initials
                            FROM tmp_breeding_line_names n
                        ) w
                    ) b
                ) c
                WHERE NOT EXISTS (SELECT 1 FROM `lines` l WHERE l.project_id = c.project_id AND l.name = c.final_name);
                """);

            // 5d. Each plant's line.
            list.Add("""
                UPDATE tmp_breeding_plants t
                JOIN `lines` l ON l.project_id = t.project_id AND l.is_founders = 1
                SET t.line_id = l.id WHERE t.bucket = 'founders';
                """);
            list.Add("""
                UPDATE tmp_breeding_plants t
                JOIN `lines` l ON l.project_id = t.project_id AND l.name = '(unnamed)'
                SET t.line_id = l.id WHERE t.bucket = 'unnamed';
                """);
            list.Add("""
                UPDATE tmp_breeding_plants t
                JOIN tmp_breeding_line_names n ON n.project_id = t.project_id AND n.lkey = t.lname
                JOIN `lines` l ON l.project_id = n.project_id AND l.name = n.final_name
                SET t.line_id = l.id WHERE t.bucket = 'named';
                """);

            // 7. Populations: one per (line, kind, legacy generation); season,
            // year and place stay NULL; legacy generations are kept as written.
            list.Add("""
                INSERT INTO populations (project_id, line_id, kind, generation, season, year, field_id, created_at)
                SELECT d.project_id, d.line_id, d.kind, d.generation, NULL, NULL, NULL, UTC_TIMESTAMP(6)
                FROM (SELECT DISTINCT project_id, line_id, kind, generation FROM tmp_breeding_plants) d
                WHERE NOT EXISTS (
                    SELECT 1 FROM populations q
                    WHERE q.line_id = d.line_id AND q.kind = d.kind AND q.generation = d.generation
                      AND q.season IS NULL AND q.year IS NULL AND q.field_id IS NULL);
                """);

            // 8a. Tag number: per (project, line) in generation then plant_id
            // order, continuing after lines.next_seq - 1 so a re-run cannot repeat.
            list.Add("""
                CREATE TABLE tmp_breeding_seq AS
                SELECT t.plant_id,
                    (l.next_seq - 1) + ROW_NUMBER() OVER (PARTITION BY t.project_id, t.line_id ORDER BY t.generation, t.plant_id) AS seq
                FROM tmp_breeding_plants t
                JOIN `lines` l ON l.id = t.line_id AND l.project_id = t.project_id;
                """);

            // 8b. Plant to population, and its tag {code}-{label}-{seq:000}
            // (Founders: {code}-{seq:000}).
            list.Add("""
                UPDATE project_items i
                JOIN tmp_breeding_plants t ON t.plant_id = i.plant_id AND t.project_id = i.project_id
                JOIN tmp_breeding_seq s ON s.plant_id = t.plant_id
                JOIN `lines` l ON l.id = t.line_id AND l.project_id = t.project_id
                JOIN populations pop ON pop.line_id = t.line_id AND pop.kind = t.kind AND pop.generation = t.generation
                    AND pop.season IS NULL AND pop.year IS NULL AND pop.field_id IS NULL
                SET i.population_id = pop.id,
                    i.tag = CONCAT(l.code, '-',
                        CASE WHEN l.is_founders = 1 THEN '' ELSE CONCAT(IF(t.kind = 'P' AND t.generation = 0, 'P', CONCAT(t.kind, t.generation)), '-') END,
                        IF(s.seq < 1000, LPAD(s.seq, 3, '0'), CAST(s.seq AS CHAR)))
                WHERE i.population_id IS NULL;
                """);

            // 8c. The counter never goes down.
            list.Add("""
                UPDATE `lines` l
                JOIN (SELECT t.line_id, MAX(s.seq) AS max_seq
                      FROM tmp_breeding_plants t JOIN tmp_breeding_seq s ON s.plant_id = t.plant_id
                      GROUP BY t.line_id) m ON m.line_id = l.id
                SET l.next_seq = GREATEST(l.next_seq, m.max_seq + 1);
                """);

            // 9. No line_origins rows for legacy lines (shown as imported).
            list.AddRange(DropTempTables);
            return list.ToArray();
        }

        // M-B Down (lossy, see the migration): write the legacy columns back,
        // then empty the new tables so the database is exactly "after M-A".
        public static readonly string[] BackfillDown =
        {
            """
            UPDATE project_items i
            JOIN populations p ON p.id = i.population_id AND p.project_id = i.project_id
            JOIN `lines` l ON l.id = p.line_id AND l.project_id = i.project_id
            JOIN projects pr ON pr.project_id = i.project_id
            SET i.line = IF(l.is_founders = 1 OR l.name = '(unnamed)', '---', l.name),
                i.generation = COALESCE(p.generation, 0),
                i.project_name = pr.project_name;
            """,
            """
            UPDATE project_items SET
                plant_mother_id = COALESCE(plant_mother_id, '---'),
                plant_father_id = COALESCE(plant_father_id, '---'),
                fruit_color = COALESCE(fruit_color, '---'),
                fruit_weight = COALESCE(fruit_weight, '---'),
                seed_color = COALESCE(seed_color, '---'),
                seed_weight = COALESCE(seed_weight, '---'),
                line = COALESCE(line, '---'),
                generation = COALESCE(generation, 0),
                project_name = COALESCE(project_name, '');
            """,
            "UPDATE project_items SET population_id = NULL, tag = NULL, mother_removed_tag = NULL, father_removed_tag = NULL;",
            "DELETE FROM line_origins;",
            "DELETE FROM populations;",
            "DELETE FROM `lines`;",
        };

        // Invariants: each query returns a violation count, all must be 0. Used
        // by the M-C gate and, verbatim, by run-mysql-checks.sh.
        public static readonly (string Name, string Sql)[] Invariants =
        {
            ("inv_plant_has_population_and_tag",
             "SELECT COUNT(*) FROM project_items WHERE population_id IS NULL OR tag IS NULL"),
            ("inv_plant_project_exists",
             "SELECT COUNT(*) FROM project_items i WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.project_id = i.project_id)"),
            ("inv_plant_population_same_project",
             "SELECT COUNT(*) FROM project_items i JOIN populations p ON p.id = i.population_id WHERE p.project_id <> i.project_id"),
            ("inv_population_line_same_project",
             "SELECT COUNT(*) FROM populations p JOIN `lines` l ON l.id = p.line_id WHERE l.project_id <> p.project_id"),
            ("inv_parent_same_project",
             "SELECT COUNT(*) FROM project_items c JOIN project_items p ON p.plant_id IN (c.plant_mother_id, c.plant_father_id) WHERE p.project_id <> c.project_id"),
            ("inv_parent_exists_and_not_self",
             "SELECT COUNT(*) FROM project_items c WHERE (c.plant_mother_id IS NOT NULL AND (c.plant_mother_id = c.plant_id OR NOT EXISTS (SELECT 1 FROM project_items p WHERE p.plant_id = c.plant_mother_id AND p.project_id = c.project_id))) OR (c.plant_father_id IS NOT NULL AND (c.plant_father_id = c.plant_id OR NOT EXISTS (SELECT 1 FROM project_items p WHERE p.plant_id = c.plant_father_id AND p.project_id = c.project_id)))"),
            ("inv_tag_unique_per_project",
             "SELECT COUNT(*) FROM (SELECT project_id, tag FROM project_items GROUP BY project_id, tag HAVING COUNT(*) > 1) d"),
            ("inv_line_name_unique_per_project",
             "SELECT COUNT(*) FROM (SELECT project_id, name FROM `lines` GROUP BY project_id, name HAVING COUNT(*) > 1) d"),
            ("inv_line_code_unique_per_project",
             "SELECT COUNT(*) FROM (SELECT project_id, code FROM `lines` GROUP BY project_id, code HAVING COUNT(*) > 1) d"),
            ("inv_population_field_same_project",
             "SELECT COUNT(*) FROM populations p JOIN fields f ON f.id = p.field_id WHERE f.project_id <> p.project_id"),
            ("inv_origin_source_same_project",
             "SELECT COUNT(*) FROM line_origins o JOIN `lines` l ON l.id = o.line_id JOIN `lines` s ON s.id = o.source_line_id WHERE s.project_id <> l.project_id"),
            ("inv_successor_same_project",
             "SELECT COUNT(*) FROM `lines` l JOIN `lines` s ON s.id = l.successor_line_id WHERE s.project_id <> l.project_id"),
            ("inv_one_founders_line_per_project",
             "SELECT COUNT(*) FROM projects p WHERE (SELECT COUNT(*) FROM `lines` l WHERE l.project_id = p.project_id AND l.is_founders = 1) <> 1"),
            ("inv_no_blank_placeholder_values",
             "SELECT COUNT(*) FROM project_items WHERE plant_mother_id REGEXP '^[[:space:]]*(---)?[[:space:]]*$' OR plant_father_id REGEXP '^[[:space:]]*(---)?[[:space:]]*$' OR fruit_color REGEXP '^[[:space:]]*(---)?[[:space:]]*$' OR fruit_weight REGEXP '^[[:space:]]*(---)?[[:space:]]*$' OR seed_color REGEXP '^[[:space:]]*(---)?[[:space:]]*$' OR seed_weight REGEXP '^[[:space:]]*(---)?[[:space:]]*$'"),
            ("inv_orphan_count_matches_backup_log",
             "SELECT CASE WHEN COALESCE((SELECT row_count FROM breeding_migration_log WHERE step = 'orphans_removed'), -1) = COALESCE((SELECT row_count FROM breeding_migration_log WHERE step = 'backup_orphan_rows'), -2) THEN 0 ELSE 1 END"),
            ("inv_backup_table_exists",
             "SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'project_items_backup_step1') THEN 0 ELSE 1 END"),
        };

        // The M-C gate: one INSERT that adds two identical rows (a duplicate-key
        // error on breeding_migration_log.step, which aborts the migration with
        // a readable message) only when some invariant is violated. Needs no
        // stored-routine privilege.
        public static string GateSql()
        {
            var any = string.Join(" OR ", Invariants.Select(i => $"({i.Sql}) > 0"));
            return $"""
                INSERT INTO breeding_migration_log (step, row_count)
                SELECT 'M-C gate: invariant violated', 1 FROM (SELECT 1 AS x UNION ALL SELECT 2) two
                WHERE {any};
                """;
        }
    }
}
