import { db } from "../data/db.js";

const getProjectById = (projectId) => {
    const project = new Promise((resolve, reject) => {
        db.query("SELECT project_id FROM projects WHERE project_id = ?", [projectId],
        (error,response)=>{
            if (error) {
                reject(error);
                return;
              } else {
                resolve(response);
              }
            }
    )});
    return project;
}

export {getProjectById}