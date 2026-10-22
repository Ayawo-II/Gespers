"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store/api-store";
import { useHeader } from "@/lib/header-context";
import { canAccessPath, hasPermission, landingPathForRole, visibleInNav, type Permission } from "@/lib/rbac";
import { ROLE_LABELS, type Agent } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { Loading } from "@/components/ui";
import { RadioLomeLogo } from "@/components/RadioLomeLogo";
import {
  IconBuilding,
  IconCalendar,
  IconDashboard,
  IconFileText,
  IconKey,
  IconLogout,
  IconMail,
  IconMenu,
  IconSearch,
  IconSettings,
  IconShield,
  IconUser,
  IconUsers,
} from "@/components/Icons";

const NAV: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  perm?: Permission;
  group: string;
}[] = [
  { href: "/ma-section", label: "Ma section", Icon: IconUsers, group: "Mon périmètre" },
  { href: "/ma-division", label: "Ma division", Icon: IconBuilding, group: "Mon périmètre" },
  { href: "/tableau-de-bord", label: "Tableau de bord", Icon: IconDashboard, group: "Suivi" },
  { href: "/moi", label: "Moi", Icon: IconUser, group: "Suivi" },
  { href: "/agents", label: "Agents", Icon: IconUsers, perm: "agents.read.team", group: "Personnel" },
  { href: "/divisions", label: "Divisions", Icon: IconBuilding, perm: "organisation.read", group: "Personnel" },
  { href: "/recherche", label: "Recherche", Icon: IconSearch, perm: "agents.read.team", group: "Personnel" },
  { href: "/courriers", label: "Courriers du ministère", Icon: IconMail, perm: "courriers.read", group: "Administration" },
  { href: "/conges", label: "Congés et permissions", Icon: IconCalendar, perm: "conges.read.team", group: "Administration" },
  { href: "/administration/comptes", label: "Comptes", Icon: IconKey, perm: "comptes.manage", group: "Gouvernance" },
  { href: "/administration/roles", label: "Rôles", Icon: IconShield, perm: "roles.manage", group: "Gouvernance" },
  { href: "/administration/audit", label: "Journal d'audit", Icon: IconFileText, perm: "audit.read", group: "Gouvernance" },
  { href: "/parametres/grilles", label: "Grilles d'avancement", Icon: IconSettings, perm: "grilles.write", group: "Gouvernance" },
];

function getFallbackPageInfo(pathname: string, currentAgent: Agent | null): { title: string; subtitle?: string } {
  if (pathname === "/tableau-de-bord") {
    return {
      title: "Tableau de bord",
      subtitle: `Bonjour, ${currentAgent?.prenoms?.split(" ")[0] ?? ""} · Radio Lomé`,
    };
  }
  if (pathname === "/moi" || pathname === "/mon-dossier") {
    return {
      title: "Moi",
      subtitle: `Espace personnel & professionnel · Matricule ${currentAgent?.matricule ?? ""}`,
    };
  }
  if (pathname === "/agents") {
    return {
      title: "Agents",
      subtitle: "Cycle de vie administratif du personnel de Radio Lomé",
    };
  }
  if (pathname === "/agents/nouveau") {
    return {
      title: "Enregistrer un agent",
      subtitle: "Création d'un nouveau dossier agent",
    };
  }
  if (pathname === "/ma-section") {
    return {
      title: "Ma section",
      subtitle: "Agents rattachés à votre section",
    };
  }
  if (pathname === "/ma-division") {
    return {
      title: "Ma division",
      subtitle: "Agents rattachés à votre division",
    };
  }
  if (pathname === "/divisions") {
    return {
      title: "Divisions",
      subtitle: "Organigramme de Radio Lomé : divisions, sections et responsables",
    };
  }
  if (pathname === "/recherche") {
    return {
      title: "Recherche",
      subtitle: "Agents du périmètre, courriers du ministère et pièces des dossiers numériques",
    };
  }
  if (pathname === "/courriers") {
    return {
      title: "Courriers du Ministère",
      subtitle: "Registre des arrêtés, actes et courriers",
    };
  }
  if (pathname === "/conges") {
    return {
      title: "Congés et permissions",
      subtitle: "Décisions déjà prises : le logiciel n'instruit pas les demandes",
    };
  }
  if (pathname === "/administration/comptes") {
    return {
      title: "Comptes",
      subtitle: "Création, désactivation motivée et réinitialisation des accès",
    };
  }
  if (pathname === "/administration/roles") {
    return {
      title: "Rôles",
      subtitle: "Matrice des habilitations et affectation des profils",
    };
  }
  if (pathname === "/administration/audit") {
    return {
      title: "Journal d'audit",
      subtitle: "Traçabilité des opérations et connexions",
    };
  }
  if (pathname === "/parametres/grilles") {
    return {
      title: "Grilles d'avancement",
      subtitle: "Paramètres utilisés pour les propositions automatiques de classe et d'échelon",
    };
  }
  return { title: "Gespers Radio Lomé" };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, session, currentCompte, currentAgent, logout } = useStore();
  const { headerTitle, headerSubtitle } = useHeader();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!ready) return;
    if (!session || !currentCompte) {
      router.replace("/connexion");
      return;
    }
    if (!canAccessPath(currentCompte.role, pathname)) {
      router.replace(landingPathForRole(currentCompte.role));
    }
  }, [ready, session, currentCompte, pathname, router]);

  const role = currentCompte?.role;
  const allowed = role ? canAccessPath(role, pathname) : false;

  const items = useMemo(() => {
    if (!role) return [];
    return NAV.filter((item) => {
      if (!visibleInNav(role, item.href)) return false;
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

  const fallback = getFallbackPageInfo(pathname, currentAgent);
  const displayTitle = headerTitle || fallback.title;
  const displaySubtitle = headerSubtitle || fallback.subtitle;

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <div className={`overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="tricolor-banner">
          <div className="green" />
          <div className="yellow" />
          <div className="red" />
        </div>
        <div className="sidebar-inner">
          <div className="brand">
            <div className="brand-main">
              <div className="brand-mark-wrapper">
                <RadioLomeLogo variant="mark" width={34} />
              </div>
              <div className="brand-info">
                <h1>
                  Radio Lomé
                  <span className="brand-badge">TG</span>
                </h1>
                <p>Gespers – Suivi agents</p>
              </div>
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
                    title={collapsed ? item.label : undefined}
                    className={pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}
                  >
                    <span className="nav-icon">
                      <item.Icon size={18} />
                    </span>
                    <span className="nav-text">{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <strong>{fullName(currentAgent)}</strong>
              <div>
                <span>{ROLE_LABELS[currentCompte.role] ?? currentCompte.role}</span>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{
                marginTop: collapsed ? 0 : 4,
                width: "100%",
                padding: collapsed ? "8px 0" : "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onClick={logout}
              title="Se déconnecter"
            >
              <IconLogout size={16} />
              {!collapsed && <span>Se déconnecter</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0, flex: 1 }}>
            <button
              className="menu-toggle"
              onClick={() => {
                if (window.innerWidth <= 860) {
                  setOpen(!open);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              aria-label="Réduire ou ouvrir le menu"
              title={collapsed ? "Déplier le menu" : "Réduire le menu"}
            >
              <IconMenu size={20} />
            </button>

            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  {displayTitle}
                </h1>
              </div>
              {displaySubtitle ? (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {displaySubtitle}
                </p>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span className="badge badge-green" style={{ fontSize: 11 }}>
              La Station du plaisir
            </span>
            <span className="muted" style={{ fontWeight: 600 }}>{currentCompte.identifiant}</span>
          </div>
        </header>
        <div className="content">
          {allowed ? children : <p className="alert alert-error">Vous n’avez pas accès à cet écran.</p>}
        </div>
      </div>
    </div>
  );
}
