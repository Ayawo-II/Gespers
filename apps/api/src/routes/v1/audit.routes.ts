import { Router } from "express";
import { listAuditEntries } from "../../controllers/audit.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const auditRoutes = Router();

auditRoutes.use(requireAuth, requirePermission("audit.read"));
auditRoutes.get("/", listAuditEntries);
