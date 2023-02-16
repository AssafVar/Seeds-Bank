import express from "express";
import { getProject } from "../controllers/projectsController.js";
const router = express.Router();

router.route('/:id').get(
    getProject
);

export default router;