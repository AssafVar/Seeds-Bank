import { db } from "../data/db.js";

const getProjectById = (projectId) => {
  const project = new Promise((resolve, reject) => {
    db.query(
      "SELECT project_id FROM projects WHERE project_id = ?",
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
  return project;
};

const handleCreateNewProject = (userId, projectId, projectName, plantType) => {
  const project = new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO project_items (project_name, user_id, project_id, plant_type, start_date) VALUES ('${projectName}','${userId}','${projectId}','${plantType}', now())`,
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

export { getProjectById, handleCreateNewProject };
