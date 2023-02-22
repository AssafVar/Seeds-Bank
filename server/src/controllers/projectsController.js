import {
  getProjectById,
  handleCreateNewProject,
} from "../models/projectsModel.js";

async function getProject(req, res, next) {
  try {
    const project = await getProjectById(req.params.id);
    console.log(project);
  } catch (err) {
    console.log(err);
  }
}
async function createNewProject(req, res, next) {
  try {
    const projectId = req.params.id;
    const { userId, projectName, plantType } = req.body;
    const newProject = await handleCreateNewProject(
      userId,
      projectId,
      projectName,
      plantType
    );
    newProject && res.status(200).send(newProject);
  } catch (err) {
    console.log(err);
  }
}

export { getProject, createNewProject };
