import { db } from "../data/db.js";

export const getProjectHeaderById = (userId, projectId) => {
  const projectHeader = new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM projects WHERE user_id = ? AND project_id = ? ",
      [userId, projectId],
      (error, response) => {
        if (error) {
          reject(error);
          return;
        } else {
          resolve(response);
        }
      }
    );
  });
  return projectHeader;
};
export const getProjectDetailsById = (projectId) => {
  const projectDetails = new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM project_items WHERE project_id = ? ",
      [projectId],
      (error, response) => {
        if (error) {
          reject(error);
          return;
        } else {
          resolve(response);
        }
      }
    );
  });
  return projectDetails;
};

export const handleCreateNewProject = (
  userId,
  projectId,
  projectName,
  plantType
) => {
  const project = new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO projects (project_name, user_id, project_id, plant_type, start_date, last_update) VALUES ('${projectName}','${userId}','${projectId}','${plantType}', now(), now())`,
      (error, response) => {
        if (error) {
          reject(error);
          return;
        } else {
          resolve(response);
        }
      }
    );
  });
  return project;
};

export const getUserProjectsList = async (userId) => {
  const projectsList = new Promise((resolve, reject) => {
    db.query(
      `SELECT project_name, user_id, project_id, plant_type,
    DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(last_update, '%Y-%m-%d') AS last_update
    FROM projects 
    WHERE user_id = '${userId}'`,
      (error, response) => {
        if (error) {
          reject(error);
          return;
        } else {
          resolve(response);
        }
      }
    );
  });
  return projectsList;
};

export const updateProjectDetails = async(user_id, project_id, projectDetails) => {
  for (const line of projectDetails) {
    const updateProject = new Promise((resolve, reject) => {
      const {
        project_name,
        project_id,
        fruit_color,
        fruit_weight,
        seed_color,
        seed_weight,
        plant_id,
        plant_father_id,
        plant_mother_id,
        generation
      } = line;
      db.query(
        "SELECT * FROM project_items WHERE plant_id=?",
        plant_id,
        (error, response) => {
          if (error) {
            reject(error);
            return;
          } else if (response.length === 0) {
            db.query(
              "INSERT INTO project_items SET project_name=?, project_id=?, fruit_color=?, fruit_weight=?, seed_color=?, seed_weight=?, plant_father_id=?, plant_mother_id=?, plant_id=?, generation=?",
              [
                project_name,
                project_id,
                fruit_color,
                fruit_weight,
                seed_color,
                seed_weight,
                plant_father_id,
                plant_mother_id,
                plant_id,
                generation,
              ],
              (error, response) => {
                if (error) {
                  reject(error);
                  return;
                } else {
                  resolve(response);
                }
              }
            );
          } else {
            db.query(
              "UPDATE project_items SET project_name=?, project_id=?, fruit_color=?, fruit_weight=?, seed_color=?, seed_weight=?, plant_father_id=?, plant_mother_id=?,generation=? WHERE plant_id=?",
              [
                project_name,
                project_id,
                fruit_color,
                fruit_weight,
                seed_color,
                seed_weight,
                plant_father_id,
                plant_mother_id,
                generation,
                plant_id,
              ],
              (error, response) => {
                if (error) {
                  reject(error);
                  return;
                } else {
                  resolve(response);
                }
              }
            );
          }
        }
      );
    });
  }
  return "Database updated successfully";
};
