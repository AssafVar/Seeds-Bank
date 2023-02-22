import express from "express";
import {
  createNewProject,
  getProject,
} from "../controllers/projectsController.js";
const router = express.Router();

router.route("/:id").get(getProject).post(createNewProject);

export default router;
