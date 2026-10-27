import { Router } from "express";
import {
  createAccount,
  listAccounts,
  resetAccountPassword,
  setAccountActive,
  updateAccountPermissions,
  updateAccountRole,
} from "../../controllers/comptes.controller.js";
import { requireAuth } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/authorize.js";

export const comptesRoutes = Router();

comptesRoutes.use(requireAuth);
comptesRoutes.get("/", requirePermission("comptes.manage"), listAccounts);
comptesRoutes.post("/", requirePermission("comptes.manage"), createAccount);
comptesRoutes.patch("/:id/role", requirePermission("roles.manage"), updateAccountRole);
comptesRoutes.put(
  "/:id/permissions",
  requirePermission("permissions.manage"),
  updateAccountPermissions,
);
comptesRoutes.patch("/:id/active", requirePermission("comptes.manage"), setAccountActive);
comptesRoutes.post("/:id/reset-password", requirePermission("comptes.manage"), resetAccountPassword);
