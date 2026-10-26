import { Router } from "express";
import {
  downloadDocument,
  getDocument,
  listDocumentTypes,
  listDocuments,
  uploadDocument,
} from "../../controllers/documents.controller.js";
import { exportDocumentsZip } from "../../controllers/exports.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requireAnyPermission, requirePermission } from "../../middlewares/authorize.js";
import { documentUpload } from "../../services/document-storage.js";

export const documentsRoutes = Router();

export const documentsReadPermissions = [
  "agents.read.self",
  "agents.read.team",
  "agents.read.all",
  "courriers.read",
] as const;

documentsRoutes.use(requireAuth);
documentsRoutes.get("/types", listDocumentTypes);
documentsRoutes.get("/", requireAnyPermission(...documentsReadPermissions), listDocuments);
documentsRoutes.get(
  "/export.zip",
  requirePermission("export"),
  requireAnyPermission(...documentsReadPermissions),
  exportDocumentsZip,
);
documentsRoutes.get(
  "/:id/file",
  requireAnyPermission(...documentsReadPermissions),
  downloadDocument,
);
documentsRoutes.get("/:id", requireAnyPermission(...documentsReadPermissions), getDocument);
documentsRoutes.post(
  "/",
  requirePermission("courriers.write"),
  documentUpload.single("file"),
  uploadDocument,
);
