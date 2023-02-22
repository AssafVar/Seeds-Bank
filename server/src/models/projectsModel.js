import { db } from "../data/db.js";

const getProjectById = (userId, projectId) => {
  const project = new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM project_items WHERE user_id = ? AND project_id = ? ",
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
  return project;
};

const handleCreateNewProject = (userId, projectId, projectName, plantType) => {
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

const getUserProjectsList = async (userId) => {
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
export { getProjectById, handleCreateNewProject, getUserProjectsList };
