import { Router } from "express";
import {
  exportAgentDossierZip,
  exportAgentsCsv,
  exportAgentsPdf,
  exportAgentsXlsx,
} from "../../controllers/exports.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/authorize.js";

export const exportsRoutes = Router();

exportsRoutes.use(requireAuth);
exportsRoutes.get(
  "/agents/:id/dossier.zip",
  requirePermission("export"),
  requireAnyPermission("agents.read.all", "agents.read.team", "agents.read.self"),
  exportAgentDossierZip,
);
exportsRoutes.get(
  "/agents.csv",
  requirePermission("export"),
  requirePermission("agents.read.all"),
  exportAgentsCsv,
);
exportsRoutes.get(
  "/agents.xlsx",
  requirePermission("export"),
  requirePermission("agents.read.all"),
  exportAgentsXlsx,
);
exportsRoutes.get(
  "/agents.pdf",
  requirePermission("export"),
  requirePermission("agents.read.all"),
  exportAgentsPdf,
);
