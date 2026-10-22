import { Router } from "express";
import {
  closeCareer,
  getTitularisation,
  upsertTitularisation,
} from "../../controllers/parcours.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const parcoursRoutes = Router();

parcoursRoutes.use(requireAuth);
parcoursRoutes.get(
  "/agents/:id/titularisation",
  requirePermission("agents.read.all"),
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
