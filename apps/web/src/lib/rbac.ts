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
  | "organisation.read"
  | "organisation.write"
  | "export";

export const ROLE_PERMS: Record<string, Permission[]> = {
  // --- Roles Prisma officiels (majuscules) ---
  AGENT: ["dashboard.self", "agents.read.self", "conges.read.self"],
  CHEF_SECTION: [
    "dashboard.self",
    "dashboard.team",
    "agents.read.self",
    "agents.read.team",
    "conges.read.self",
    "conges.read.team",
  ],
  CHEF_DIVISION: [
    "dashboard.self",
    "dashboard.team",
    "agents.read.self",
    "agents.read.team",
    "conges.read.self",
    "conges.read.team",
  ],
  RESPONSABLE_RH: [
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
    "organisation.read",
    "organisation.write",
    "export",
  ],
  CHEF_PERSONNEL: [
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
    "organisation.read",
    "organisation.write",
    "export",
  ],
  DG: [
    "dashboard.self",
    "dashboard.org",
    "agents.read.all",
    "agents.read.self",
    "avancements.read",
    "courriers.read",
    "conges.read.all",
    "conges.read.self",
    "organisation.read",
    "export",
  ],

  // --- Retro-compatibilitÃ© aliases minuscules ---
  agent: ["dashboard.self", "agents.read.self", "conges.read.self"],
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
    "organisation.read",
    "organisation.write",
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
    "organisation.read",
    "export",
  ],
};

export function hasPermission(role: Role | string, perm: Permission) {
  const perms = ROLE_PERMS[role];
  return perms ? perms.includes(perm) : false;
}

/** Navigation limitÃ©e par rÃ´le : si une liste est dÃ©finie, le rÃ´le ne voit que ces rubriques. */
export const NAV_PATHS_BY_ROLE: Partial<Record<string, readonly string[]>> = {
  AGENT: ["/tableau-de-bord", "/moi", "/mon-dossier"],
  agent: ["/tableau-de-bord", "/moi", "/mon-dossier"],
  CHEF_SECTION: ["/tableau-de-bord", "/moi", "/mon-dossier", "/ma-section"],
  chef: ["/tableau-de-bord", "/moi", "/mon-dossier", "/ma-section"],
  CHEF_DIVISION: ["/tableau-de-bord", "/moi", "/mon-dossier", "/ma-division"],
  DG: ["/tableau-de-bord", "/moi", "/mon-dossier", "/agents", "/divisions", "/courriers"],
  dg: ["/tableau-de-bord", "/moi", "/mon-dossier", "/agents", "/divisions", "/courriers"],
  RESPONSABLE_RH: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
  ],
  rh: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
  ],
  CHEF_PERSONNEL: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
  ],
  chef_personnel: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
  ],
};

export function visibleInNav(role: Role | string, href: string) {
  const list = NAV_PATHS_BY_ROLE[role];
  return !list || list.includes(href);
}

function matchesPathList(pathname: string, list: readonly string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function canAccessPath(role: Role | string, pathname: string): boolean {
  const scoped = NAV_PATHS_BY_ROLE[role];
  if (scoped && !matchesPathList(pathname, scoped)) return false;
  if (pathname.startsWith("/tableau-de-bord")) return true;
  if (pathname.startsWith("/moi") || pathname.startsWith("/mon-dossier")) return true;
  if (pathname.startsWith("/ma-section")) {
    return role === "CHEF_SECTION" || role === "chef";
  }
  if (pathname.startsWith("/ma-division")) {
    return role === "CHEF_DIVISION";
  }
  if (pathname.startsWith("/recherche")) {
    return hasPermission(role, "agents.read.all") || hasPermission(role, "agents.read.team");
  }
  if (pathname.startsWith("/divisions")) return hasPermission(role, "organisation.read");
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
    return (
      hasPermission(role, "comptes.manage") ||
      hasPermission(role, "audit.read") ||
      hasPermission(role, "roles.manage")
    );
  }
  return false;
}
