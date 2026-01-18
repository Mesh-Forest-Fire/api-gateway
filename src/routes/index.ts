import { Router } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import incidentsRoutes from "./incidents.routes";
// import { errorHandler } from "./middleware/errorHandler";

const router = Router();

router.use(helmet());
router.use(cors());
router.use(morgan("combined"));

router.use("/incidents", incidentsRoutes);

// router.use(errorHandler);

export default router;
