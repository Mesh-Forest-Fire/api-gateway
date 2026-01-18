import { Router } from "express";
import { getRoot } from "../controllers/homeController";

const router = Router();

// Home route -> controller -> model
router.get("/", getRoot);

export default router;
