import {
  handleCreateNewProject,
  getUserProjectsList,
  getProjectHeaderById,
  getProjectDetailsById,
  updateProjectDetails,
  handleDeletePlant,
} from "../models/projectsModel.js";

export async function getProject(req, res) {
  try {
    const { userId, projectId } = req.params;
    const projectHeaders = await getProjectHeaderById(userId, projectId);
    const projectDetails = await getProjectDetailsById(projectId);
    res.status(200).json({ projectHeaders: projectHeaders[0], projectDetails });
  } catch (err) {
    console.log(err);
  }
}
export async function createNewProject(req, res, next) {
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

export async function getUserProjectList(req, res) {
  try {
    const userId = req.params.userId;
    const results = await getUserProjectsList(userId);
    res.status(200).json(results);
  } catch (err) {
    console.log(err);
  }
}

export async function updateProject(req, res) {
  try {
    const { user_id, project_id } = req.params;
    const projectDetails = req.body;
    const results = await updateProjectDetails(
      user_id,
      project_id,
      projectDetails
    );
    if (results === "Database updated successfully") {
      res.status(200).send({ message: "Database updated successfully" });
    } else {
      res.status(500).send({ message: "Failed update the database" });
    }
  } catch (err) {
    console.log(err);
  }
}

export async function deletePlant(req, res) {
  try {
    const { plantId } = req.params;
    const response = await handleDeletePlant(plantId);
    if (response === "Database updated successfully") {
      res.status(200).send("Database updated successfully");
    } else {
      res.status(500).send({ message: "Failed updating database" });
    }
  } catch (err) {
    console.log(err);
  }
}
