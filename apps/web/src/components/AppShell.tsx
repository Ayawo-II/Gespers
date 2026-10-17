"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/mock/store";
import { canAccessPath, hasPermission, type Permission } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { Loading } from "@/components/ui";

const NAV: { href: string; label: string; perm?: Permission; group: string }[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", group: "Suivi" },
  { href: "/mon-dossier", label: "Mon dossier", group: "Suivi" },
  { href: "/agents", label: "Agents", perm: "agents.read.team", group: "Personnel" },
  { href: "/recherche", label: "Recherche", perm: "agents.read.team", group: "Personnel" },
  { href: "/avancements", label: "Avancements", perm: "avancements.read", group: "Carrière" },
  { href: "/avancements/eligibles", label: "Agents éligibles", perm: "avancements.read", group: "Carrière" },
  { href: "/courriers", label: "Courriers du ministère", perm: "courriers.read", group: "Administration" },
  { href: "/conges", label: "Congés et permissions", perm: "conges.read.team", group: "Administration" },
  { href: "/administration/comptes", label: "Comptes", perm: "comptes.manage", group: "Gouvernance" },
  { href: "/administration/roles", label: "Rôles", perm: "roles.manage", group: "Gouvernance" },
  { href: "/administration/audit", label: "Journal d'audit", perm: "audit.read", group: "Gouvernance" },
  { href: "/parametres/grilles", label: "Grilles d'avancement", perm: "grilles.write", group: "Gouvernance" },
];

function crumbs(pathname: string) {
  const map: Record<string, string> = {
    "tableau-de-bord": "Tableau de bord",
    "mon-dossier": "Mon dossier",
    agents: "Agents",
    nouveau: "Nouvel enregistrement",
    edit: "Modification",
    carriere: "Carrière",
    dossier: "Dossier numérique",
    recherche: "Recherche",
    avancements: "Avancements",
    eligibles: "Éligibles",
    manuel: "Avancement manuel",
    courriers: "Courriers",
    conges: "Congés",
    administration: "Administration",
    comptes: "Comptes",
    roles: "Rôles",
    audit: "Audit",
    parametres: "Paramètres",
    grilles: "Grilles",
  };
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((p, i) => ({
    href: "/" + parts.slice(0, i + 1).join("/"),
    label: map[p] ?? p,
  }));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, session, currentCompte, currentAgent, logout } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session || !currentCompte) {
      router.replace("/connexion");
    }
  }, [ready, session, currentCompte, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const role = currentCompte?.role;
  const allowed = role ? canAccessPath(role, pathname) : false;

  const items = useMemo(() => {
    if (!role) return [];
    return NAV.filter((item) => {
      if (!item.perm) return true;
      if (item.perm === "agents.read.team") {
        return hasPermission(role, "agents.read.team") || hasPermission(role, "agents.read.all");
      }
      if (item.perm === "conges.read.team") {
        return (
          hasPermission(role, "conges.read.team") ||
          hasPermission(role, "conges.read.all") ||
          hasPermission(role, "conges.read.self")
        );
      }
      return hasPermission(role, item.perm);
    });
  }, [role]);

  if (!ready || !currentCompte) return <Loading />;

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.group] ??= [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <div className="app-shell">
      <div className={`overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">RL</div>
          <div>
            <h1>Radio Lomé</h1>
            <p>Gespers – suivi des agents</p>
          </div>
        </div>
        <nav className="nav">
          {Object.entries(grouped).map(([group, list]) => (
            <div key={group}>
              <div className="nav-label">{group}</div>
              {list.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <strong>{fullName(currentAgent)}</strong>
          <span>{ROLE_LABELS[currentCompte.role]}</span>
          <button className="btn btn-secondary" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="menu-toggle" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
              Menu
            </button>
            <nav className="crumbs">
              <Link href="/tableau-de-bord">Accueil</Link>
              {crumbs(pathname).map((c) => (
                <span key={c.href}>
                  / <Link href={c.href}>{c.label === pathname.split("/").pop() ? <strong>{c.label}</strong> : c.label}</Link>
                </span>
              ))}
            </nav>
          </div>
          <span className="muted">{currentCompte.identifiant}</span>
        </header>
        <div className="content">
          {allowed ? children : <p className="alert alert-error">Vous n’avez pas accès à cet écran.</p>}
        </div>
      </div>
    </div>
  );
}
