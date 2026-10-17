import type { Role } from "@/lib/types";

export type Permission =
  | "dashboard.self"
  | "dashboard.team"
  | "dashboard.org"
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
  | "export";

export const ROLE_PERMS: Record<Role, Permission[]> = {
  agent: [
    "dashboard.self",
    "agents.read.self",
    "conges.read.self",
  ],
  chef: [
    "dashboard.self",
    "dashboard.team",
    "agents.read.self",
    "agents.read.team",
    "conges.read.self",
    "conges.read.team",
  ],
  rh: [
    "dashboard.self",
    "dashboard.org",
    "agents.read.all",
    "agents.read.self",
    "agents.write",
    "avancements.read",
    "avancements.write",
    "courriers.read",
    "courriers.write",
    "conges.read.all",
    "conges.read.self",
    "conges.write",
    "export",
  ],
  chef_personnel: [
    "dashboard.self",
    "dashboard.org",
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
    "export",
  ],
  dg: [
    "dashboard.self",
    "dashboard.org",
    "agents.read.all",
    "agents.read.self",
    "avancements.read",
    "courriers.read",
    "conges.read.all",
    "conges.read.self",
    "export",
  ],
};

export function hasPermission(role: Role, perm: Permission) {
  return ROLE_PERMS[role].includes(perm);
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (pathname.startsWith("/tableau-de-bord")) return true;
  if (pathname.startsWith("/mon-dossier")) return true;
  if (pathname.startsWith("/recherche")) {
    return hasPermission(role, "agents.read.all") || hasPermission(role, "agents.read.team");
  }
  if (pathname.startsWith("/agents")) {
    return (
      hasPermission(role, "agents.read.all") ||
      hasPermission(role, "agents.read.team")
    );
  }
  if (pathname.startsWith("/parametres/grilles")) return hasPermission(role, "grilles.write");
  if (pathname.startsWith("/avancements")) return hasPermission(role, "avancements.read");
  if (pathname.startsWith("/courriers")) return hasPermission(role, "courriers.read");
  if (pathname.startsWith("/conges")) {
    return (
      hasPermission(role, "conges.read.all") ||
      hasPermission(role, "conges.read.team") ||
      hasPermission(role, "conges.read.self")
    );
  }
  if (pathname.startsWith("/administration/comptes")) return hasPermission(role, "comptes.manage");
  if (pathname.startsWith("/administration/roles")) return hasPermission(role, "roles.manage");
  if (pathname.startsWith("/administration/audit")) return hasPermission(role, "audit.read");
  if (pathname.startsWith("/administration")) {
    return hasPermission(role, "comptes.manage") || hasPermission(role, "audit.read") || hasPermission(role, "roles.manage");
  }
  return false;
}
