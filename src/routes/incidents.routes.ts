import { Router } from "express";
import { getIncidents, getIncidentById, postIncident } from "../controllers/incidentsController";
import { incidentsStreamHandler } from "../streams/incidents.stream";

const router = Router();


// GET /incidents - paginated list
router.get("/", getIncidents);

// POST /incidents - create incident
router.post("/", postIncident);

// GET /incidents/stream - server-sent events
router.get("/stream", incidentsStreamHandler);

// GET /incidents/:id - single incident by Mongo _id
router.get("/:id", getIncidentById);

export default router;
