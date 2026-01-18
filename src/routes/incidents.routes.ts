import { Router } from "express";
import { getIncidents, getIncidentById } from "../controllers/incidentsController";

const router = Router();

// GET /incidents - paginated list
router.get("/", getIncidents);

// GET /incidents/:id - single incident by Mongo _id
router.get("/:id", getIncidentById);

export default router;
