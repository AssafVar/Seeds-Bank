import { getProjectById } from "../models/projectsModel.js";

async function getProject(req, res, next) {
  try {
    const project = await getProjectById(req.params.id);
    console.log(project);
  } catch (err) {
    console.log(err);
  }
}

export { getProject };
