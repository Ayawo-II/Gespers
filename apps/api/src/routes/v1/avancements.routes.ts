import { Router } from "express";
import {
  createAgentAdvancement,
  listAgentAdvancements,
} from "../../controllers/avancements.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requireAnyPermission, requirePermission } from "../../middlewares/authorize.js";

export const avancementsRoutes = Router();

avancementsRoutes.use(requireAuth);
avancementsRoutes.get(
  "/agents/:id/avancements",
  requireAnyPermission(
    "avancements.read",
    "agents.read.self",
    "agents.read.team",
    "agents.read.all",
  ),
  listAgentAdvancements,
);
avancementsRoutes.post(
  "/agents/:id/avancements",
  requirePermission("avancements.write"),
  createAgentAdvancement,
);
