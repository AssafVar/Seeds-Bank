-- The three tables that existed BEFORE EF Core migrations were adopted
-- (users, projects, project_items). The first migration only adds to them, so
-- a fresh test database needs them created by hand. Synthetic, no data.
CREATE TABLE IF NOT EXISTS users (
    userId varchar(255) NOT NULL PRIMARY KEY,
    email longtext NOT NULL,
    password longtext NOT NULL,
    userName longtext NULL
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS projects (
    project_id varchar(255) NOT NULL PRIMARY KEY,
    user_id longtext NOT NULL,
    project_name longtext NOT NULL,
    plant_type longtext NOT NULL,
    start_date datetime(6) NOT NULL,
    last_update datetime(6) NOT NULL
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS project_items (
    plant_id varchar(255) NOT NULL PRIMARY KEY,
    project_id longtext NOT NULL,
    project_name longtext NOT NULL,
    line longtext NOT NULL,
    plant_father_id longtext NOT NULL,
    plant_mother_id longtext NOT NULL,
    fruit_color longtext NOT NULL,
    fruit_weight longtext NOT NULL,
    seed_color longtext NOT NULL,
    seed_weight longtext NOT NULL,
    generation int NOT NULL
) CHARACTER SET utf8mb4;
