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
import { requirePermission } from "../../middlewares/authorize.js";
import { documentUpload } from "../../services/document-storage.js";

export const documentsRoutes = Router();

documentsRoutes.use(requireAuth);
documentsRoutes.get("/types", requirePermission("courriers.read"), listDocumentTypes);
documentsRoutes.get("/", requirePermission("courriers.read"), listDocuments);
documentsRoutes.get(
  "/export.zip",
  requirePermission("export"),
  requirePermission("courriers.read"),
  exportDocumentsZip,
);
documentsRoutes.get("/:id/file", requirePermission("courriers.read"), downloadDocument);
documentsRoutes.get("/:id", requirePermission("courriers.read"), getDocument);
documentsRoutes.post(
  "/",
  requirePermission("courriers.write"),
  documentUpload.single("file"),
  uploadDocument,
);
