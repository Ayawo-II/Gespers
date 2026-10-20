"use client";

import { useState } from "react";
import { Alert, Card, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { ROLE_PERMS, type Permission } from "@/lib/rbac";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { fullName } from "@/lib/utils";

const PERM_LABELS: Record<Permission, string> = {
  "dashboard.self": "Tableau de bord personnel",
  "dashboard.team": "Tableau d'équipe",
  "dashboard.org": "Tableau institutionnel",
  "agents.read.all": "Lecture de tous les agents",
  "agents.read.team": "Lecture de l'équipe",
  "agents.read.self": "Lecture de son dossier",
  "agents.write": "Écriture agents",
  "avancements.read": "Lecture avancements",
  "avancements.write": "Écriture avancements",
  "grilles.write": "Paramétrage des grilles",
  "courriers.read": "Lecture courriers",
  "courriers.write": "Écriture courriers",
  "conges.read.all": "Lecture de tous les congés",
  "conges.read.team": "Lecture congés d'équipe",
  "conges.read.self": "Lecture de ses congés",
  "conges.write": "Enregistrement des congés",
  "comptes.manage": "Gestion des comptes",
  "roles.manage": "Gestion des rôles",
  "audit.read": "Journal d'audit",
  "organisation.read": "Consultation de l'organigramme",
  "organisation.write": "Gestion de l'organigramme",
  export: "Export CSV",
};

const PERMS = Object.keys(PERM_LABELS) as Permission[];
const ROLES = Object.keys(ROLE_LABELS) as Role[];

export default function RolesPage() {
  const { state, changeRole } = useStore();
  const [msg, setMsg] = useState("");
  const comptes = state.comptes.filter((c) => c.identifiant !== "systeme");

  return (
    <>
      <PageHeader
        title="Rôles"
        subtitle="Matrice des habilitations et affectation des profils"
      />
      {msg ? <Alert>{msg}</Alert> : null}
      <Card>
        <h3>Matrice des droits</h3>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Permission</th>
                {ROLES.map((r) => (
                  <th key={r}>{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p}>
                  <td>{PERM_LABELS[p]}</td>
                  {ROLES.map((r) => (
                    <td key={r}>{ROLE_PERMS[r].includes(p) ? "Oui" : "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h3>Affecter un rôle</h3>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Compte</th>
                <th>Agent</th>
                <th>Rôle actuel</th>
                <th>Changer</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => {
                const agent = state.agents.find((a) => a.id === c.agentId);
                return (
                  <tr key={c.id}>
                    <td>{c.identifiant}</td>
                    <td>{fullName(agent)}</td>
                    <td>{ROLE_LABELS[c.role]}</td>
                    <td>
                      <select
                        value={c.role}
                        onChange={(e) => {
                          changeRole(c.id, e.target.value as Role);
                          setMsg(`Rôle mis à jour pour ${c.identifiant}.`);
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
