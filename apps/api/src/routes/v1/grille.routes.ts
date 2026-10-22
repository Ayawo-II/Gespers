import { Router } from "express";
import { getGrille, updateGrille } from "../../controllers/grille.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const grilleRoutes = Router();

grilleRoutes.use(requireAuth, requirePermission("grilles.write"));
grilleRoutes.get("/avancement", getGrille);
grilleRoutes.put("/avancement", updateGrille);
