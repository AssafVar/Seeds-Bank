import express from "express";
import {
  createNewProject,
  getProject,
  getUserProjectList,
} from "../controllers/projectsController.js";
const router = express.Router();

router.route("/:userId/:project").get(getProject);
router.route("/:userId").get(getUserProjectList).post(createNewProject);
export default router;
