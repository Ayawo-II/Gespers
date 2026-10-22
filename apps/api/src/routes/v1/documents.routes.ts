import { Router } from "express";
import {
  downloadDocument,
  downloadDocumentVersion,
  getDocument,
  listDocumentTypes,
  listDocuments,
  replaceDocumentFile,
  uploadDocument,
} from "../../controllers/documents.controller.js";
import { exportDocumentsZip } from "../../controllers/exports.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/authorize.js";
import { documentUpload } from "../../services/document-storage.js";

export const documentsRoutes = Router();

documentsRoutes.use(requireAuth);
const requireDocumentReadAccess = requireAnyPermission(
  "documents.read.all",
  "documents.read.team",
  "documents.read.self",
  "courriers.read",
);
documentsRoutes.get("/types", requireDocumentReadAccess, listDocumentTypes);
documentsRoutes.get("/", requireDocumentReadAccess, listDocuments);
documentsRoutes.get(
  "/export.zip",
  requirePermission("export"),
  requirePermission("documents.read.all"),
  exportDocumentsZip,
);
documentsRoutes.get("/:id/file", requireDocumentReadAccess, downloadDocument);
documentsRoutes.get("/:id/versions/:versionId/file", requireDocumentReadAccess, downloadDocumentVersion);
documentsRoutes.put(
  "/:id/file",
  requirePermission("documents.write"),
  documentUpload.single("file"),
  replaceDocumentFile,
);
documentsRoutes.get("/:id", requireDocumentReadAccess, getDocument);
documentsRoutes.post(
  "/",
  requirePermission("documents.write"),
  documentUpload.single("file"),
  uploadDocument,
);
