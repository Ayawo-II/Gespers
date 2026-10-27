import { Router } from "express";
import {
  createAgent,
  getAgent,
  listAgents,
  updateAgent,
  updateAgentPhoto,
  updateMyPhoto,
} from "../../controllers/agents.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/authorize.js";

export const agentsRoutes = Router();

agentsRoutes.use(requireAuth);
const requireAgentReadAccess = requireAnyPermission(
  "agents.read.all",
  "agents.read.team",
  "agents.read.self",
);

agentsRoutes.get("/", requireAgentReadAccess, listAgents);
agentsRoutes.get("/:id", requireAgentReadAccess, getAgent);
agentsRoutes.post(
  "/",
  requireAnyPermission("agents.write", "agents.create.division"),
  createAgent,
);
agentsRoutes.patch("/me/photo", requirePermission("agents.read.self"), updateMyPhoto);
agentsRoutes.patch("/:id/photo", requirePermission("agents.photo.write"), updateAgentPhoto);
agentsRoutes.patch("/:id", requirePermission("agents.write"), updateAgent);
