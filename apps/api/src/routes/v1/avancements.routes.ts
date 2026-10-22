import { Router } from "express";
import {
  createAgentAdvancement,
  listEligibleAdvancements,
  listAgentAdvancements,
} from "../../controllers/avancements.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const avancementsRoutes = Router();

avancementsRoutes.use(requireAuth);
avancementsRoutes.get(
  "/avancements/eligibles",
  requirePermission("avancements.read"),
  listEligibleAdvancements,
);
avancementsRoutes.get(
  "/agents/:id/avancements",
  requirePermission("avancements.read"),
  listAgentAdvancements,
);
avancementsRoutes.post(
  "/agents/:id/avancements",
  requirePermission("avancements.write"),
  createAgentAdvancement,
);
