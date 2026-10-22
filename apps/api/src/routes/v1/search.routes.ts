import { Router } from "express";
import { searchGlobally } from "../../controllers/search.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";

export const searchRoutes = Router();

searchRoutes.use(requireAuth);
searchRoutes.get("/", searchGlobally);
