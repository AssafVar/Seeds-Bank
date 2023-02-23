import express from "express";
import {
  createNewProject,
  getProject,
  getUserProjectList,
  updateProject,
} from "../controllers/projectsController.js";
const router = express.Router();

router.route("/:userId/:projectId")
  .get(getProject)
  .post(updateProject);
router.route("/:userId")
  .get(getUserProjectList)
  .post(createNewProject);
export default router;
