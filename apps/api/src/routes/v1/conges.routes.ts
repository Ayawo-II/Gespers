import { Router } from "express";
import {
  createConge,
  getLeaveBalance,
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

congesRoutes.use(requireAuth);
const requireCongeReadAccess = requireAnyPermission(
  "conges.read.all",
  "conges.read.team",
  "conges.read.self",
);
congesRoutes.get("/", requireCongeReadAccess, listConges);
congesRoutes.get("/solde/:personneId", requireCongeReadAccess, getLeaveBalance);
congesRoutes.get("/:id", requireCongeReadAccess, getConge);
congesRoutes.post("/", requirePermission("conges.write"), createConge);
congesRoutes.put("/:id", requirePermission("conges.write"), updateConge);
