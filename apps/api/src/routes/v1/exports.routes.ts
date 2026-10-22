import { Router } from "express";
import { exportAgentsCsv } from "../../controllers/exports.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const exportsRoutes = Router();

exportsRoutes.use(requireAuth);
exportsRoutes.get(
  "/agents.csv",
  requirePermission("export"),
  requirePermission("agents.read.all"),
  exportAgentsCsv,
);
