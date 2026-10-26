import { Router } from "express";
import { getGrille, updateGrille } from "../../controllers/grille.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const grilleRoutes = Router();

grilleRoutes.use(requireAuth);
grilleRoutes.get("/avancement", requirePermission("grilles.read"), getGrille);
grilleRoutes.put("/avancement", requirePermission("grilles.write"), updateGrille);
