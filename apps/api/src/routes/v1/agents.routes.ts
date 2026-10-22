import { Router } from "express";
import {
  createAgent,
  getAgent,
  listAgents,
  updateAgent,
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
agentsRoutes.post("/", requirePermission("agents.write"), createAgent);
agentsRoutes.patch("/:id", requirePermission("agents.write"), updateAgent);
