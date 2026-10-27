import type { Role } from "@/lib/types";

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

export const ROLE_PERMS: Record<string, Permission[]> = {
  // --- Roles Prisma officiels (majuscules) ---
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

  // --- Retro-compatibilitÃ© aliases minuscules ---
  agent: ["agents.read.self", "conges.read.self"],
  chef: [
    "agents.read.self",
    "agents.read.team",
    "agents.photo.write",
    "conges.read.self",
    "conges.read.team",
    "organisation.read",
  ],
  rh: [
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
  chef_personnel: [
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
  dg: [
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

export function hasPermission(
  role: Role | string,
  perm: Permission,
  delegated: readonly string[] = [],
) {
  const perms = ROLE_PERMS[role];
  return (perms ? perms.includes(perm) : false) || delegated.includes(perm);
}

/**
 * Page d'accueil par rôle. Le tableau de bord est réservé aux rôles
 * institutionnels (RH, chef du personnel, DG) : les autres rôles sont
 * redirigés vers leur espace métier.
 */
export function landingPathForRole(role: Role | string): string {
  if (role === "AGENT" || role === "agent") return "/moi";
  if (role === "CHEF_SECTION" || role === "chef") return "/ma-section";
  if (role === "CHEF_DIVISION") return "/ma-division";
  return "/tableau-de-bord";
}

/** Navigation limitÃ©e par rÃ´le : si une liste est dÃ©finie, le rÃ´le ne voit que ces rubriques. */
export const NAV_PATHS_BY_ROLE: Partial<Record<string, readonly string[]>> = {
  AGENT: ["/moi", "/mon-dossier"],
  agent: ["/moi", "/mon-dossier"],
  CHEF_SECTION: ["/moi", "/mon-dossier", "/ma-section", "/agents", "/recherche", "/conges"],
  chef: ["/moi", "/mon-dossier", "/ma-section", "/agents", "/recherche", "/conges"],
  CHEF_DIVISION: ["/moi", "/mon-dossier", "/ma-division", "/agents", "/recherche", "/conges"],
  DG: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/divisions",
    "/courriers",
    "/conges",
    "/recherche",
  ],
  dg: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/divisions",
    "/courriers",
    "/conges",
    "/recherche",
  ],
  RESPONSABLE_RH: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
    "/conges",
    "/recherche",
    "/administration/comptes",
    "/administration/audit",
  ],
  rh: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
    "/conges",
    "/recherche",
    "/administration/comptes",
    "/administration/audit",
  ],
  CHEF_PERSONNEL: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
    "/conges",
    "/recherche",
    "/administration/comptes",
    "/administration/roles",
    "/administration/audit",
  ],
  chef_personnel: [
    "/tableau-de-bord",
    "/moi",
    "/mon-dossier",
    "/agents",
    "/courriers",
    "/divisions",
    "/conges",
    "/recherche",
    "/administration/comptes",
    "/administration/roles",
    "/administration/audit",
  ],
};

export function visibleInNav(role: Role | string, href: string) {
  const list = NAV_PATHS_BY_ROLE[role];
  return !list || list.includes(href);
}

function matchesPathList(pathname: string, list: readonly string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function canAccessPath(
  role: Role | string,
  pathname: string,
  delegated: readonly string[] = [],
): boolean {
  const can = (permission: Permission) =>
    hasPermission(role, permission, delegated);
  const scoped = NAV_PATHS_BY_ROLE[role];
  if (scoped && !matchesPathList(pathname, scoped)) return false;
  if (pathname.startsWith("/tableau-de-bord")) return can("dashboard.read");
  if (pathname.startsWith("/moi") || pathname.startsWith("/mon-dossier")) return true;
  if (pathname.startsWith("/ma-section")) {
    return role === "CHEF_SECTION" || role === "chef";
  }
  if (pathname.startsWith("/ma-division")) {
    return role === "CHEF_DIVISION";
  }
  if (pathname.startsWith("/recherche")) {
    return can("agents.read.all") || can("agents.read.team");
  }
  if (pathname.startsWith("/divisions")) return can("organisation.read");
  if (pathname.startsWith("/agents")) {
    return can("agents.read.all") || can("agents.read.team");
  }
  if (pathname.startsWith("/avancements")) return can("avancements.read");
  if (pathname.startsWith("/courriers")) return can("courriers.read");
  if (pathname.startsWith("/conges")) {
    return (
      can("conges.read.all") ||
      can("conges.read.team") ||
      can("conges.read.self")
    );
  }
  if (pathname.startsWith("/administration/comptes")) return can("comptes.manage");
  if (pathname.startsWith("/administration/roles")) return can("permissions.manage");
  if (pathname.startsWith("/administration/audit")) return can("audit.read");
  if (pathname.startsWith("/administration")) {
    return (
      can("comptes.manage") ||
      can("audit.read") ||
      can("roles.manage") ||
      can("permissions.manage")
    );
  }
  return false;
}
