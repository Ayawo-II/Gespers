import { Router } from "express";
import {
  createCourrier,
  getCourrier,
  listCourriers,
  updateCourrier,
} from "../../controllers/courriers.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const courriersRoutes = Router();

courriersRoutes.use(requireAuth);
courriersRoutes.get("/", requirePermission("courriers.read"), listCourriers);
courriersRoutes.get("/:id", requirePermission("courriers.read"), getCourrier);
courriersRoutes.post("/", requirePermission("courriers.write"), createCourrier);
courriersRoutes.put("/:id", requirePermission("courriers.write"), updateCourrier);
