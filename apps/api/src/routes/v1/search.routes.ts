import { Router } from "express";
import { searchGlobally } from "../../controllers/search.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requireAnyPermission } from "../../middlewares/authorize.js";

export const searchRoutes = Router();

searchRoutes.use(
  requireAuth,
  requireAnyPermission(
    "agents.read.self",
    "agents.read.team",
    "agents.read.all",
  ),
);
searchRoutes.get("/", searchGlobally);
