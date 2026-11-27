-- SYNTHETIC legacy data: made-up users, projects, plant ids, line names and
-- trait values. No export from a real database. Load into the legacy tables
-- (legacy-schema.sql) BEFORE migration AddBreedingSchema.
--
-- What it covers: several lines, generations 0 to 3, '---', blank and
-- whitespace-only parents and traits, a dangling parent, a parent in another
-- project (of another user), a self-parent, case-different and
-- trailing-space line names, the same line name in two projects, orphan
-- project_ids, an unnamed line with children, a line called Founders, code
-- collisions, a non-ASCII name, a line named P.
--
-- EXPECT (the check script compares these):
--   items_before        = 46
--   orphan_rows         = 3
--   items_after         = 43
--   projects            = 4
--   lines               = see run-mysql-checks.sh (it prints the count)
--   unknown_parent_marks (mother/father_removed_tag = '(unknown)') = 6

INSERT INTO users (userId, email, password, userName) VALUES
 ('user-1', 'one@example.invalid', 'x', 'One'),
 ('user-2', 'two@example.invalid', 'x', 'Two'),
 ('user-3', 'three@example.invalid', 'x', NULL);

INSERT INTO projects (project_id, user_id, project_name, plant_type, start_date, last_update) VALUES
 ('proj-a', 'user-1', 'Tomatoes A', 'Vegetable', '2025-01-01', '2025-06-01'),
 ('proj-b', 'user-2', 'Tomatoes B', 'Vegetable', '2025-01-01', '2025-06-01'),
 ('proj-c', 'user-1', 'Empty project', 'Vegetable', '2025-01-01', '2025-01-01'),
 ('proj-d', 'user-3', 'Beta beans', 'Vegetable', '2025-01-01', '2025-06-01');

-- plant_id, project_id, project_name, line, father, mother, fruit_color, fruit_weight, seed_color, seed_weight, generation
INSERT INTO project_items VALUES
 -- proj-a: line Roma, generations 0 to 3
 ('a1',  'proj-a', 'Tomatoes A', 'Roma',  '---', '---', 'red',  '10g',   'black', '1g',  0),
 ('a2',  'proj-a', 'Tomatoes A', 'roma',  '---', '---', '---',  '---',   '---',   '---', 0),
 ('a3',  'proj-a', 'Tomatoes A', 'Roma ', '',    '  ',  '',     ' ',     '',      '',    0),
 ('a4',  'proj-a', 'Tomatoes A', 'Roma',  'a1',  'a2',  'red',  '10.5 g','black', '1g',  1),
 ('a5',  'proj-a', 'Tomatoes A', 'Roma',  'a4',  'a4',  'red',  '11g',   'black', '1g',  2),
 ('a6',  'proj-a', 'Tomatoes A', 'Roma',  'a4',  'a1',  'Red',  '10g',   'black', '1g',  2),
 ('a7',  'proj-a', 'Tomatoes A', 'Roma',  'a6',  'a5',  'red',  '10g',   'black', '1g',  3),
 -- dangling parent, parent in another project, self-parent, parent that is an orphan row
 ('a8',  'proj-a', 'Tomatoes A', 'Roma',  'ghost-1', 'a1', 'red', '9g', 'black', '1g', 1),
 ('a9',  'proj-a', 'Tomatoes A', 'Roma',  'a1',  'b1',  'red',  '9g',    'black', '1g',  1),
 ('a10', 'proj-a', 'Tomatoes A', 'Roma',  '---', 'a10', 'red',  '9g',    'black', '1g',  1),
 ('a26', 'proj-a', 'Tomatoes A', 'Roma',  'o1',  'a1',  'red',  '9g',    'black', '1g',  1),
 -- non-ASCII name, then a selfed child
 ('a11', 'proj-a', 'Tomatoes A', 'Müller', '---', '---', 'pink', '8g', 'black', '1g', 0),
 ('a12', 'proj-a', 'Tomatoes A', 'Müller', 'a11', 'a11', 'pink', '8g', 'black', '1g', 1),
 -- unnamed: parentless gen 0 go to Founders, the rest to (unnamed)
 ('a13', 'proj-a', 'Tomatoes A', '---',   '---', '---', 'red', '7g', 'black', '1g', 0),
 ('a14', 'proj-a', 'Tomatoes A', '',      '---', '---', 'red', '7g', 'black', '1g', 0),
 ('a15', 'proj-a', 'Tomatoes A', '---',   '---', 'a13', 'red', '7g', 'black', '1g', 1),
 ('a16', 'proj-a', 'Tomatoes A', '   ',   'a14', 'a13', 'red', '7g', 'black', '1g', 1),
 -- a legacy line called Founders (name collision with the built-in line)
 ('a17', 'proj-a', 'Tomatoes A', 'Founders', '---', 'a1', 'red', '7g', 'black', '1g', 1),
 -- code collisions: CTR twice, a line named P, names with no ASCII letters
 ('a18', 'proj-a', 'Tomatoes A', 'Cherry Tomato Red',  '---', '---', 'red',  '3g', 'black', '1g', 0),
 ('a19', 'proj-a', 'Tomatoes A', 'Cherry Tomato Rose', '---', '---', 'pink', '3g', 'black', '1g', 0),
 ('a20', 'proj-a', 'Tomatoes A', 'Roma Classic', 'a1', 'a1', 'red', '10g', 'black', '1g', 1),
 ('a21', 'proj-a', 'Tomatoes A', 'P',   '---', '---', 'red', '3g', 'black', '1g', 0),
 ('a22', 'proj-a', 'Tomatoes A', '!!!', '---', '---', 'red', '3g', 'black', '1g', 0),
 ('a23', 'proj-a', 'Tomatoes A', 'שלום', '---', '---', 'red', '3g', 'black', '1g', 0),
 -- proj-b (another user): the same line name Roma stays a separate line
 ('b1',  'proj-b', 'Tomatoes B', 'Roma', '---', '---', 'yellow', '12g', 'black', '1g', 0),
 ('b2',  'proj-b', 'Tomatoes B', 'Roma', 'b1',  'b1',  'yellow', '12g', 'black', '1g', 1),
 ('b3',  'proj-b', 'Tomatoes B', 'Roma', '---', 'a1',  'yellow', '12g', 'black', '1g', 1),
 -- proj-d: case-different names merge inside the project only
 ('d1',  'proj-d', 'Beta beans', 'Beta', '---', '---', 'green', '2g', 'white', '1g', 0),
 ('d2',  'proj-d', 'Beta beans', 'BETA', '---', '---', 'green', '2g', 'white', '1g', 0),
 ('d3',  'proj-d', 'Beta beans', 'beta', '---', '---', 'green', '2g', 'white', '1g', 0),
 ('d4',  'proj-d', 'Beta beans', 'Beta', 'd1',  'd2',  'green', '2g', 'white', '1g', 1),
 -- orphan rows: project_id matches no project (they must survive only in the backup)
 ('o1',  'no-such-project', 'Gone', 'Roma', '---', '---', 'red', '1g', 'black', '1g', 0),
 ('o2',  'no-such-project', 'Gone', 'Roma', 'o1',  'o1',  'red', '1g', 'black', '1g', 1),
 ('o3',  'proj-gone',       'Gone', 'Beta', '---', '---', 'red', '1g', 'black', '1g', 0);

-- Filler so generations and tag numbering run past one digit.
INSERT INTO project_items
SELECT CONCAT('f', n), 'proj-b', 'Tomatoes B', 'Filler Line', '---', '---', 'red', '5g', 'black', '1g', 0
FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) x;
