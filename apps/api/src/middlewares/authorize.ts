import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "./errorHandler.js";

export type Permission =
  | "dashboard.read"
  | "agents.read.all"
  | "agents.read.team"
  | "agents.read.self"
  | "agents.write"
  | "avancements.read"
  | "avancements.write"
  | "grilles.write"
  | "courriers.read"
  | "courriers.write"
  | "conges.read.all"
  | "conges.read.team"
  | "conges.read.self"
  | "conges.write"
  | "comptes.manage"
  | "roles.manage"
  | "audit.read"
  | "organisation.read"
  | "organisation.write"
  | "export";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  AGENT: ["agents.read.self", "conges.read.self"],
  CHEF_SECTION: [
    "agents.read.self",
    "agents.read.team",
    "conges.read.self",
    "conges.read.team",
  ],
  CHEF_DIVISION: [
    "agents.read.self",
    "agents.read.team",
    "conges.read.self",
    "conges.read.team",
  ],
  RESPONSABLE_RH: [
    "dashboard.read",
    "agents.read.all",
    "agents.read.self",
    "agents.write",
    "avancements.read",
    "avancements.write",
    "grilles.write",
    "courriers.read",
    "courriers.write",
    "conges.read.all",
    "conges.read.self",
    "conges.write",
    "comptes.manage",
    "roles.manage",
    "audit.read",
    "organisation.read",
    "organisation.write",
    "export",
  ],
  CHEF_PERSONNEL: [
    "dashboard.read",
    "agents.read.all",
    "agents.read.self",
    "agents.write",
    "avancements.read",
    "avancements.write",
    "grilles.write",
    "courriers.read",
    "courriers.write",
    "conges.read.all",
    "conges.read.self",
    "conges.write",
    "comptes.manage",
    "roles.manage",
    "audit.read",
    "organisation.read",
    "organisation.write",
    "export",
  ],
  DG: [
    "dashboard.read",
    "agents.read.all",
    "agents.read.self",
    "avancements.read",
    "courriers.read",
    "conges.read.all",
    "conges.read.self",
    "organisation.read",
    "export",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requireAnyPermission(...permissions: Permission[]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.authenticatedUser;
    if (!user) {
      next(new AppError("Authentification requise.", 401, "UNAUTHENTICATED"));
      return;
    }

    if (!permissions.some((permission) => hasPermission(user.role, permission))) {
      next(new AppError("Permission insuffisante.", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}

export function requirePermission(permission: Permission): RequestHandler {
  return requireAnyPermission(permission);
}
