import { Router } from "express";
import {
  createConge,
  getConge,
  listConges,
  updateConge,
} from "../../controllers/conges.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const congesRoutes = Router();

congesRoutes.use(requireAuth);
congesRoutes.get("/", requirePermission("conges.read.all"), listConges);
congesRoutes.get("/:id", requirePermission("conges.read.all"), getConge);
congesRoutes.post("/", requirePermission("conges.write"), createConge);
congesRoutes.put("/:id", requirePermission("conges.write"), updateConge);
