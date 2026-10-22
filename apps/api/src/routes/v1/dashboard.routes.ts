import { Router } from "express";
import { getDashboardSummary } from "../../controllers/dashboard.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth, requirePermission("dashboard.read"));
dashboardRoutes.get("/summary", getDashboardSummary);
