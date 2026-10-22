import { Router } from "express";
import {
  createConge,
  getConge,
  listConges,
  updateConge,
} from "../../controllers/conges.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/authorize.js";

export const congesRoutes = Router();

const canReadConge = requireAnyPermission(
  "conges.read.all",
  "conges.read.team",
  "conges.read.self",
);

congesRoutes.use(requireAuth);
congesRoutes.get("/", canReadConge, listConges);
congesRoutes.get("/:id", canReadConge, getConge);
congesRoutes.post("/", requirePermission("conges.write"), createConge);
congesRoutes.put("/:id", requirePermission("conges.write"), updateConge);
