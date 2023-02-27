import express from "express";
import {
  createNewProject,
  getProject,
  getUserProjectList,
  updateProject,
  deletePlant,
} from "../controllers/projectsController.js";
const router = express.Router();

router.route("/:userId/:projectId")
  .get(getProject)
  .post(updateProject);
  
router.route("/:userId")
  .get(getUserProjectList)
  .post(createNewProject);

router.route("/:userId/:projectId/:plantId")
  .delete(deletePlant);
export default router;
