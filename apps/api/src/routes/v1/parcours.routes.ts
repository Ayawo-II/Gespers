import { Router } from "express";
import {
  closeCareer,
  getTitularisation,
  upsertTitularisation,
} from "../../controllers/parcours.controller.js";
import {
  endAssignment,
  getCareerHistory,
  startAssignment,
} from "../../controllers/historique.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/authorize.js";

export const parcoursRoutes = Router();

parcoursRoutes.use(requireAuth);
parcoursRoutes.get(
  "/agents/:id/historique",
  requireAnyPermission("agents.read.all", "agents.read.team", "agents.read.self"),
  getCareerHistory,
);
parcoursRoutes.post(
  "/agents/:id/affectations",
  requirePermission("agents.write"),
  startAssignment,
);
parcoursRoutes.put(
  "/agents/:id/affectations/:sectionId/fin",
  requirePermission("agents.write"),
  endAssignment,
);
parcoursRoutes.get(
  "/agents/:id/titularisation",
  requireAnyPermission("agents.read.all", "agents.read.team", "agents.read.self"),
  getTitularisation,
);
parcoursRoutes.put(
  "/agents/:id/titularisation",
  requirePermission("agents.write"),
  upsertTitularisation,
);
parcoursRoutes.post(
  "/agents/:id/depart",
  requirePermission("agents.write"),
  closeCareer,
);
