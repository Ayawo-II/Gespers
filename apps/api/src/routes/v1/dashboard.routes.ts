import { Router } from "express";
import {
  getDashboardSummary,
  getPersonalDashboard,
  getTeamDashboard,
} from "../../controllers/dashboard.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/authorize.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get(
  "/me",
  requireAnyPermission("agents.read.self", "agents.read.all"),
  getPersonalDashboard,
);
dashboardRoutes.get(
  "/team",
  requirePermission("agents.read.team"),
  getTeamDashboard,
);
dashboardRoutes.get("/summary", requirePermission("dashboard.read"), getDashboardSummary);
