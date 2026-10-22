import { Router } from "express";
import {
  createDivision,
  createSection,
  getDivision,
  getSection,
  listDivisions,
  listSections,
  updateDivision,
  updateSection,
} from "../../controllers/organisation.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const organisationRoutes = Router();

organisationRoutes.use(requireAuth);

organisationRoutes.get(
  "/divisions",
  requirePermission("organisation.read"),
  listDivisions,
);
organisationRoutes.get(
  "/divisions/:id",
  requirePermission("organisation.read"),
  getDivision,
);
organisationRoutes.post(
  "/divisions",
  requirePermission("organisation.write"),
  createDivision,
);
organisationRoutes.patch(
  "/divisions/:id",
  requirePermission("organisation.write"),
  updateDivision,
);

organisationRoutes.get(
  "/sections",
  requirePermission("organisation.read"),
  listSections,
);
organisationRoutes.get(
  "/sections/:id",
  requirePermission("organisation.read"),
  getSection,
);
organisationRoutes.post(
  "/sections",
  requirePermission("organisation.write"),
  createSection,
);
organisationRoutes.patch(
  "/sections/:id",
  requirePermission("organisation.write"),
  updateSection,
);
