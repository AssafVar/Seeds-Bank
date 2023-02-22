import {
  getProjectById,
  handleCreateNewProject,
  getUserProjectsList,
} from "../models/projectsModel.js";

async function getProject(req, res) {
  try {
    const {userId, projectId} = req.params;
    const project = await getProjectById(userId, projectId);
    res.status(200).json(project[0]);
  } catch (err) {
    console.log(err);
  }
}
async function createNewProject(req, res, next) {
  try {
    const userId = req.params.userId;
    const { projectName, plantType, projectId } = req.body;
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

async function getUserProjectList(req, res) {
  try {
    const userId = req.params.userId;
    const results = await getUserProjectsList(userId);
    res.status(200).json(results);
  } catch (err) {
    console.log(err);
  }
}

export { getProject, createNewProject, getUserProjectList };
