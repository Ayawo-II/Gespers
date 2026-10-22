import { Router } from "express";
import { apiV1Router } from "./v1/index.js";
import { healthRouter } from "./health.routes.js";

export const router = Router();

router.use("/health", healthRouter);
router.use("/api/v1", apiV1Router);
