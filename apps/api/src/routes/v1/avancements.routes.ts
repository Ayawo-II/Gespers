import { Router } from "express";
import {
  createAgentAdvancement,
  listAgentAdvancements,
} from "../../controllers/avancements.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const avancementsRoutes = Router();

avancementsRoutes.use(requireAuth);
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
