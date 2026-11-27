#!/usr/bin/env bash
# Local migration check for the step-1 breeding migrations on MySQL 8.0.34.
# Not run in CI. Starts a throwaway container, loads the SYNTHETIC legacy
# fixture, applies M-A -> M-B -> M-C, runs the invariant queries after each
# step, round-trips Down/Up and re-runs the backfill. Prints counts only.
#
#   cd server && Server.Tests/Fixtures/run-mysql-checks.sh
#
# The container password is generated per run (or taken from MYSQL_LOCAL_PW);
# it is never written to a file.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$HERE/../.." && pwd)"
NAME="${CONTAINER_NAME:-seeds-step1-mysql}"
PORT="${MYSQL_PORT:-3307}"
PW="${MYSQL_LOCAL_PW:-$(openssl rand -hex 12)}"
DB=seedsbank

START=20260723203849_AddWorkersAndFieldWorkLogs
MA=AddBreedingSchema
MB=BackfillBreedingData
MC=FinalizeBreedingSchema

FAILS=0
cleanup() { if [ "${KEEP:-0}" != 1 ]; then docker rm -f "$NAME" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT
cleanup

sql()  { docker exec -i -e MYSQL_PWD="$PW" "$NAME" mysql -uroot -N -B "$DB" "$@"; }
one()  { echo "$1" | sql; }
check() { # name, expected, actual
  if [ "$2" = "$3" ]; then echo "  ok    $1 = $3"; else echo "  FAIL  $1: expected $2, got $3"; FAILS=$((FAILS+1)); fi
}
# Program.cs reads ConnectionStrings:Default (empty in appsettings.json), so
# EF's DbContext discovery needs it too, not only --connection.
CONN="Server=127.0.0.1;Port=$PORT;Database=$DB;User=root;Password=$PW"
export ConnectionStrings__Default="$CONN"
(cd "$SERVER_DIR" && dotnet restore >/dev/null)
migrate() {
  (cd "$SERVER_DIR" && dotnet ef database update "$1" --connection \
     "$CONN" >"$HERE/.ef-last-error" 2>&1 ) \
     || { echo "  FAIL  dotnet ef database update $1"; tail -8 "$HERE/.ef-last-error" | sed 's/Password=[^;]*/Password=***/'; FAILS=$((FAILS+1)); return 1; }
  rm -f "$HERE/.ef-last-error"
}
invariants() {
  while IFS=$'\t' read -r name query; do
    [ -z "$name" ] && continue
    check "$name" 0 "$(one "$query")"
  done < <(grep -v '^--' "$HERE/invariants.tsv")
}
dump_schema() { docker exec -e MYSQL_PWD="$PW" "$NAME" mysqldump -uroot --no-data --skip-comments --skip-add-drop-table "$DB" 2>/dev/null | sed 's/AUTO_INCREMENT=[0-9]* //' | grep -v '^/\*![0-9]* .*\*/;$'; }

echo "== start mysql:8.0.34 on port $PORT"
docker run -d --name "$NAME" -e MYSQL_ROOT_PASSWORD="$PW" -e MYSQL_DATABASE="$DB" -p "127.0.0.1:$PORT:3306" mysql:8.0.34 >/dev/null
for i in $(seq 1 90); do
  if docker exec -e MYSQL_PWD="$PW" "$NAME" mysql -uroot -e 'SELECT 1' "$DB" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "== legacy schema + migrations up to $START"
sql < "$HERE/legacy-schema.sql"
migrate "$START"
dump_schema > "$HERE/.schema-start.sql"
sql < "$HERE/legacy-project-items.sql"
check items_before 46 "$(one 'SELECT COUNT(*) FROM project_items')"

echo "== M-A $MA (expand)"
migrate "$MA"
check backup_rows 46 "$(one 'SELECT COUNT(*) FROM project_items_backup_step1')"
check items_unchanged 46 "$(one 'SELECT COUNT(*) FROM project_items')"
check legacy_columns_untouched 0 "$(one "SELECT COUNT(*) FROM project_items i JOIN project_items_backup_step1 b ON b.plant_id=i.plant_id WHERE NOT (i.line <=> b.line AND i.generation <=> b.generation AND i.plant_mother_id <=> b.plant_mother_id AND i.plant_father_id <=> b.plant_father_id AND i.fruit_color <=> b.fruit_color)")"
# A second run of M-A's backup statement must not replace the backup.
one "INSERT INTO project_items (plant_id, project_id) VALUES ('zz-new', 'proj-c')"
one "CREATE TABLE IF NOT EXISTS project_items_backup_step1 AS SELECT * FROM project_items"
check backup_not_overwritten 46 "$(one 'SELECT COUNT(*) FROM project_items_backup_step1')"
one "DELETE FROM project_items WHERE plant_id='zz-new'"

echo "== M-B $MB (backfill)"
migrate "$MB"
ORPHANS="$(one "SELECT row_count FROM breeding_migration_log WHERE step='orphans_removed'")"
check orphans_removed 3 "$ORPHANS"
check items_after 43 "$(one 'SELECT COUNT(*) FROM project_items')"
check items_equal_backup_minus_orphans 0 "$(one "SELECT (SELECT COUNT(*) FROM project_items_backup_step1) - $ORPHANS - (SELECT COUNT(*) FROM project_items)")"
check orphans_only_in_backup 3 "$(one "SELECT COUNT(*) FROM project_items_backup_step1 b WHERE NOT EXISTS (SELECT 1 FROM project_items i WHERE i.plant_id=b.plant_id)")"
check unknown_parent_marks 5 "$(one "SELECT SUM(mother_removed_tag='(unknown)') + SUM(father_removed_tag='(unknown)') FROM project_items")"
check projects_with_founders 4 "$(one "SELECT COUNT(*) FROM \`lines\` WHERE is_founders=1")"
check roma_stays_two_lines 2 "$(one "SELECT COUNT(*) FROM \`lines\` WHERE name='Roma'")"
check case_variants_merge_in_proj_d 1 "$(one "SELECT COUNT(*) FROM \`lines\` WHERE project_id='proj-d' AND name LIKE 'beta'")"
check legacy_founders_renamed 1 "$(one "SELECT COUNT(*) FROM \`lines\` WHERE project_id='proj-a' AND name='Founders (legacy)'")"
check unnamed_line_children 2 "$(one "SELECT COUNT(*) FROM project_items i JOIN populations p ON p.id=i.population_id JOIN \`lines\` l ON l.id=p.line_id WHERE l.name='(unnamed)'")"
check unnamed_gen0_in_founders 2 "$(one "SELECT COUNT(*) FROM project_items i JOIN populations p ON p.id=i.population_id JOIN \`lines\` l ON l.id=p.line_id WHERE l.is_founders=1 AND i.project_id='proj-a'")"
check generation_kept 0 "$(one "SELECT COUNT(*) FROM project_items i JOIN populations p ON p.id=i.population_id JOIN project_items_backup_step1 b ON b.plant_id=i.plant_id WHERE p.generation <> b.generation")"
check traits_preserved 0 "$(one "SELECT COUNT(*) FROM project_items i JOIN project_items_backup_step1 b ON b.plant_id=i.plant_id WHERE NOT (i.fruit_weight <=> IF(b.fruit_weight REGEXP '^[[:space:]]*(---)?[[:space:]]*\$', NULL, b.fruit_weight))")"
check next_seq_is_count_plus_1 0 "$(one "SELECT COUNT(*) FROM \`lines\` l WHERE l.next_seq <> 1 + (SELECT COUNT(*) FROM project_items i JOIN populations p ON p.id=i.population_id WHERE p.line_id=l.id)")"
check population_count_ge_distinct_line_generation 1 "$(one "SELECT (SELECT COUNT(*) FROM populations) >= (SELECT COUNT(*) FROM (SELECT DISTINCT i.project_id, l.id, p.generation FROM project_items i JOIN populations p ON p.id=i.population_id JOIN \`lines\` l ON l.id=p.line_id) d)")"
echo "  info  lines=$(one 'SELECT COUNT(*) FROM `lines`') populations=$(one 'SELECT COUNT(*) FROM populations') codes=$(one "SELECT GROUP_CONCAT(code ORDER BY code) FROM \`lines\` WHERE project_id='proj-a'")"
invariants
echo "== idempotency: run the backfill SQL a second time"
STATE() { echo "$(one "SELECT CONCAT(COUNT(*),'/',SUM(next_seq)) FROM \`lines\`")/$(one 'SELECT COUNT(*) FROM populations')/$(one 'SELECT COUNT(*) FROM project_items WHERE tag IS NOT NULL')/$(one "SELECT MD5(GROUP_CONCAT(plant_id, tag ORDER BY plant_id)) FROM project_items")"; }
BEFORE="$(STATE)"
# Build first (quietly) so the script output holds SQL only, then drop every
# whole statement that touches the migrations history (they span lines).
(cd "$SERVER_DIR" && dotnet build >/dev/null 2>&1)
(cd "$SERVER_DIR" && dotnet ef migrations script --no-build "$MA" "$MB" >"$HERE/.m-b.sql" 2>/dev/null)
awk '/__EFMigrationsHistory/{s=1} { if(!s) print; if(s && /;[ \t]*$/) s=0 }' "$HERE/.m-b.sql" | sql
rm -f "$HERE/.m-b.sql"
check rerun_changes_nothing "$BEFORE" "$(STATE)"
invariants

echo "== M-C $MC (contract)"
migrate "$MC"
invariants
check legacy_columns_dropped 0 "$(one "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='project_items' AND column_name IN ('line','generation','project_name')")"
check tag_not_null 'NO' "$(one "SELECT is_nullable FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='project_items' AND column_name='tag'")"
# Constraint checks the in-memory provider cannot see
check dup_tag_rejected 1062 "$(docker exec -i -e MYSQL_PWD="$PW" "$NAME" mysql -uroot -N -B "$DB" -e "INSERT INTO project_items (plant_id, project_id, tag, population_id) SELECT 'dup1', project_id, tag, population_id FROM project_items LIMIT 1" 2>&1 | sed -n 's/^ERROR \([0-9]*\).*/\1/p')"
check dup_line_name_rejected 1062 "$(docker exec -i -e MYSQL_PWD="$PW" "$NAME" mysql -uroot -N -B "$DB" -e "INSERT INTO \`lines\` (project_id, name, code, created_at) SELECT project_id, name, 'ZZ', NOW(6) FROM \`lines\` LIMIT 1" 2>&1 | sed -n 's/^ERROR \([0-9]*\).*/\1/p')"
echo "  info  fk rules: $(one "SELECT GROUP_CONCAT(CONCAT(table_name,'.',constraint_name,'=',delete_rule) ORDER BY table_name, constraint_name SEPARATOR '; ') FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() AND table_name IN ('lines','populations','line_origins','project_items')")"
# Deleting a parent plant directly nulls the child's link (safety net)
one "DELETE FROM project_items WHERE plant_id='a1'"
check parent_delete_nulls_child 0 "$(one "SELECT COUNT(*) FROM project_items WHERE plant_id='a4' AND plant_father_id IS NOT NULL")"
# Deleting a project cascades its whole breeding tree
one "DELETE FROM projects WHERE project_id='proj-a'"
check project_delete_cascades 0 "$(one "SELECT (SELECT COUNT(*) FROM project_items WHERE project_id='proj-a') + (SELECT COUNT(*) FROM \`lines\` WHERE project_id='proj-a') + (SELECT COUNT(*) FROM populations WHERE project_id='proj-a')")"
# Design 3.7: the whole tree of a project goes with it (plants with parent
# self-links, a successor chain, populations with a field, origins), and no
# other project loses anything. Named after the test plan's check.
one "INSERT INTO fields (project_id, name, vertices_json, shape_type, sowing_structure, land_width, land_length, plant_spacing, row_spacing, created_at) VALUES ('proj-b','Cascade field','[]','rectangle','grid',1,1,1,1,NOW(6))"
one "INSERT INTO \`lines\` (project_id, name, code, next_seq, created_at) VALUES ('proj-b','Cascade A','CA1',1,NOW(6)),('proj-b','Cascade B','CB1',1,NOW(6))"
one "UPDATE \`lines\` a JOIN \`lines\` b ON b.project_id='proj-b' AND b.name='Cascade B' SET a.successor_line_id=b.id WHERE a.project_id='proj-b' AND a.name='Cascade A'"
one "INSERT INTO line_origins (line_id, role, source_line_id, source_line_name, source_label) SELECT b.id,'forked_from',a.id,a.name,'F1' FROM \`lines\` a JOIN \`lines\` b ON b.project_id='proj-b' AND b.name='Cascade B' WHERE a.project_id='proj-b' AND a.name='Cascade A'"
one "INSERT INTO populations (project_id, line_id, kind, generation, season, year, field_id, created_at) SELECT 'proj-b', a.id, 'F', 1, 'Spring', 2026, (SELECT id FROM fields WHERE name='Cascade field' LIMIT 1), NOW(6) FROM \`lines\` a WHERE a.project_id='proj-b' AND a.name='Cascade A'"
one "INSERT INTO project_items (plant_id, project_id, tag, population_id) SELECT 'casc-1','proj-b','CA1-F1-001',p.id FROM populations p JOIN \`lines\` a ON a.id=p.line_id WHERE a.name='Cascade A' AND p.project_id='proj-b'"
one "INSERT INTO project_items (plant_id, project_id, tag, population_id, plant_mother_id, plant_father_id) SELECT 'casc-2','proj-b','CA1-F1-002',p.id,'casc-1','casc-1' FROM populations p JOIN \`lines\` a ON a.id=p.line_id WHERE a.name='Cascade A' AND p.project_id='proj-b'"
OTHER_BEFORE="$(one "SELECT (SELECT COUNT(*) FROM project_items WHERE project_id<>'proj-b') + (SELECT COUNT(*) FROM \`lines\` WHERE project_id<>'proj-b') + (SELECT COUNT(*) FROM populations WHERE project_id<>'proj-b')")"
DELETE_ERR="$(docker exec -i -e MYSQL_PWD="$PW" "$NAME" mysql -uroot -N -B "$DB" -e "DELETE FROM projects WHERE project_id='proj-b'" 2>&1 | sed -n 's/^ERROR \([0-9]*\).*/\1/p')"
check ProjectDelete_RemovesPlantsPopulationsLinesOrigins_OnMySql_no_error "" "$DELETE_ERR"
check ProjectDelete_RemovesPlantsPopulationsLinesOrigins_OnMySql 0 "$(one "SELECT (SELECT COUNT(*) FROM project_items WHERE project_id='proj-b') + (SELECT COUNT(*) FROM \`lines\` WHERE project_id='proj-b') + (SELECT COUNT(*) FROM populations WHERE project_id='proj-b') + (SELECT COUNT(*) FROM fields WHERE project_id='proj-b') + (SELECT COUNT(*) FROM line_origins o WHERE NOT EXISTS (SELECT 1 FROM \`lines\` l WHERE l.id=o.line_id))")"
check ProjectDelete_leaves_other_projects_alone "$OTHER_BEFORE" "$(one "SELECT (SELECT COUNT(*) FROM project_items WHERE project_id<>'proj-b') + (SELECT COUNT(*) FROM \`lines\` WHERE project_id<>'proj-b') + (SELECT COUNT(*) FROM populations WHERE project_id<>'proj-b')")"

echo "== Down to $START, then Up again (round trip)"
# Restore the deleted project and plant for a fair round trip
migrate "$MB" && migrate "$MA" && migrate "$START"
dump_schema > "$HERE/.schema-down.sql"
if diff <(grep -v 'breeding_migration_log\|project_items_backup_step1' "$HERE/.schema-start.sql") <(awk '/CREATE TABLE `breeding_migration_log`/,/;$/{next} /CREATE TABLE `project_items_backup_step1`/,/;$/{next} {print}' "$HERE/.schema-down.sql" | grep -v 'breeding_migration_log\|project_items_backup_step1') >/dev/null; then
  echo "  ok    schema after Down equals the starting schema (log and backup tables excepted)"
else
  echo "  FAIL  schema after Down differs from the starting schema"; FAILS=$((FAILS+1))
fi
check backup_survives_down 1 "$(one "SELECT COUNT(*) > 0 FROM project_items_backup_step1")"
migrate "$MC"
invariants
check up_down_up_items "$(one 'SELECT COUNT(*) FROM project_items')" "$(one 'SELECT COUNT(*) FROM project_items WHERE tag IS NOT NULL AND population_id IS NOT NULL')"

rm -f "$HERE/.schema-start.sql" "$HERE/.schema-down.sql"
echo
if [ "$FAILS" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "$FAILS CHECK(S) FAILED"; exit 1; fi
