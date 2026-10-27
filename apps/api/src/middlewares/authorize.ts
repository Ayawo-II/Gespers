import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "./errorHandler.js";

export type Permission =
  | "dashboard.read"
  | "agents.read.all"
  | "agents.read.team"
  | "agents.read.self"
  | "agents.write"
  | "agents.photo.write"
  | "avancements.read"
  | "avancements.write"
  | "grilles.read"
  | "grilles.write"
  | "courriers.read"
  | "courriers.write"
  | "conges.read.all"
  | "conges.read.team"
  | "conges.read.self"
  | "conges.write"
  | "comptes.manage"
  | "roles.manage"
  | "permissions.manage"
  | "agents.create.division"
  | "audit.read"
  | "organisation.read"
  | "organisation.write"
  | "export";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  AGENT: ["agents.read.self", "conges.read.self"],
  CHEF_SECTION: [
    "agents.read.self",
    "agents.read.team",
    "agents.photo.write",
    "conges.read.self",
    "conges.read.team",
    "organisation.read",
  ],
  CHEF_DIVISION: [
    "agents.read.self",
    "agents.read.team",
    "agents.photo.write",
    "conges.read.self",
    "conges.read.team",
    "organisation.read",
  ],
  RESPONSABLE_RH: [
    "dashboard.read",
    "agents.read.all",
    "agents.read.self",
    "agents.write",
    "agents.photo.write",
    "avancements.read",
    "avancements.write",
    "grilles.read",
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
    "agents.photo.write",
    "avancements.read",
    "avancements.write",
    "grilles.read",
    "grilles.write",
    "courriers.read",
    "courriers.write",
    "conges.read.all",
    "conges.read.self",
    "conges.write",
    "comptes.manage",
    "roles.manage",
    "permissions.manage",
    "audit.read",
    "organisation.read",
    "organisation.write",
    "export",
  ],
  DG: [
    "dashboard.read",
    "agents.read.all",
    "agents.read.self",
    "agents.photo.write",
    "avancements.read",
    "grilles.read",
    "courriers.read",
    "conges.read.all",
    "conges.read.self",
    "organisation.read",
    "export",
  ],
};

export const DELEGABLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  AGENT: [],
  CHEF_SECTION: ["agents.create.division"],
  CHEF_DIVISION: ["agents.create.division"],
  RESPONSABLE_RH: [],
  CHEF_PERSONNEL: [],
  DG: [],
};

export function isDelegablePermission(
  role: Role,
  permission: Permission,
): boolean {
  return DELEGABLE_PERMISSIONS[role].includes(permission);
}

export function hasPermission(
  role: Role,
  permission: Permission,
  delegatedPermissions: readonly string[] = [],
): boolean {
  return (
    ROLE_PERMISSIONS[role].includes(permission) ||
    delegatedPermissions.includes(permission)
  );
}

export function hasEffectivePermission(
  user: { role: Role; delegatedPermissions?: readonly string[] },
  permission: Permission,
): boolean {
  return hasPermission(user.role, permission, user.delegatedPermissions);
}

export function requireAnyPermission(...permissions: Permission[]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.authenticatedUser;
    if (!user) {
      next(new AppError("Authentification requise.", 401, "UNAUTHENTICATED"));
      return;
    }

    if (user.mustChangePassword) {
      next(
        new AppError(
          "Vous devez changer votre mot de passe avant de continuer.",
          403,
          "PASSWORD_CHANGE_REQUIRED",
        ),
      );
      return;
    }

    if (
      !permissions.some((permission) =>
        hasEffectivePermission(user, permission),
      )
    ) {
      next(new AppError("Permission insuffisante.", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}

export function requirePermission(permission: Permission): RequestHandler {
  return requireAnyPermission(permission);
}
