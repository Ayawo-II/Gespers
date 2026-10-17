"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/mock/store";
import { CONGE_LABELS, ROLE_LABELS } from "@/lib/types";
import { formatDate, fullName, isEligibleClasse, isEligibleEchelon, nextEchelonDate } from "@/lib/utils";
import { visibleAgents } from "@/lib/visibility";
import { hasPermission } from "@/lib/rbac";

export default function DashboardPage() {
  const { state, currentCompte, currentAgent } = useStore();
  if (!currentCompte || !currentAgent) return null;

  const role = currentCompte.role;
  const team = visibleAgents(state.agents, currentCompte, currentAgent);
  const actifs = state.comptes.filter((c) => c.identifiant !== "systeme");
  const eligibles = state.agents.filter(
    (a) =>
      isEligibleEchelon(a, state.grille, state.avancements) ||
      isEligibleClasse(a, state.grille, state.avancements),
  );
  const mesConges = state.conges.filter((c) => c.agentId === currentAgent.id);
  const mesDocs = state.documents.filter((d) => d.agentId === currentAgent.id && !d.archive);
  const congesTeam = state.conges.filter((c) => team.some((a) => a.id === c.agentId));

  return (
    <>
      <PageHeader
        title={`Bonjour, ${currentAgent.prenoms.split(" ")[0]}`}
        subtitle={`${ROLE_LABELS[role]} · ${currentAgent.poste} · ${currentAgent.service}`}
      />

      {role === "agent" || role === "chef" ? (
        <div className="grid grid-4">
          <Card className="kpi">
            <span>Situation</span>
            <strong>
              {currentAgent.categorie}
              {currentAgent.classe}.{currentAgent.echelon}
            </strong>
            <em>
              {currentAgent.statut} · {currentAgent.situation}
            </em>
          </Card>
          <Card className="kpi">
            <span>Prochain échelon (estimé)</span>
            <strong>{formatDate(nextEchelonDate(currentAgent, state.grille, state.avancements))}</strong>
            <em>Règle : {state.grille.dureeEchelonMois} mois</em>
          </Card>
          <Card className="kpi">
            <span>Congés enregistrés</span>
            <strong>{mesConges.length}</strong>
          </Card>
          <Card className="kpi">
            <span>Documents au dossier</span>
            <strong>{mesDocs.length}</strong>
          </Card>
        </div>
      ) : (
        <div className="grid grid-4">
          <Card className="kpi">
            <span>Effectif</span>
            <strong>{state.agents.length}</strong>
            <em>{state.agents.filter((a) => a.situation !== "fin_parcours").length} en activité</em>
          </Card>
          <Card className="kpi">
            <span>Fonctionnaires</span>
            <strong>{state.agents.filter((a) => a.statut === "fonctionnaire").length}</strong>
          </Card>
          <Card className="kpi">
            <span>Avancements à venir</span>
            <strong>{eligibles.length}</strong>
            <em>Selon la grille paramétrée</em>
          </Card>
          <Card className="kpi">
            <span>Comptes</span>
            <strong>{actifs.filter((c) => c.actif).length}</strong>
            <em>{actifs.filter((c) => !c.actif).length} inactifs</em>
          </Card>
        </div>
      )}

      <div className="grid grid-2">
        <Card>
          <h3 style={{ marginBottom: 12 }}>Ma situation administrative</h3>
          <p>
            <StatutBadge value={currentAgent.statut} />{" "}
            <SituationBadge value={currentAgent.situation} />
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            Matricule {currentAgent.matricule} · Entrée le {formatDate(currentAgent.dateEntree)}
          </p>
          <p style={{ marginTop: 8 }}>
            <Link className="link" href="/mon-dossier">
              Ouvrir mon dossier
            </Link>
          </p>
        </Card>

        <Card>
          <h3 style={{ marginBottom: 12 }}>Mes congés</h3>
          {mesConges.length === 0 ? (
            <p className="muted">Aucun congé enregistré.</p>
          ) : (
            mesConges.slice(0, 4).map((c) => (
              <p key={c.id} style={{ marginBottom: 8 }}>
                {CONGE_LABELS[c.type]} · {formatDate(c.dateDebut)} – {formatDate(c.dateFin)}
              </p>
            ))
          )}
        </Card>
      </div>

      {hasPermission(role, "dashboard.team") ? (
        <Card>
          <h3 style={{ marginBottom: 12 }}>Mes subordonnés</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Poste</th>
                  <th>Situation</th>
                  <th>Congé en cours</th>
                </tr>
              </thead>
              <tbody>
                {team
                  .filter((a) => a.id !== currentAgent.id)
                  .map((a) => {
                    const leave = congesTeam.find(
                      (c) =>
                        c.agentId === a.id &&
                        c.dateDebut <= new Date().toISOString().slice(0, 10) &&
                        c.dateFin >= new Date().toISOString().slice(0, 10),
                    );
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link className="link" href={`/agents/${a.id}`}>
                            {fullName(a)}
                          </Link>
                        </td>
                        <td>{a.poste}</td>
                        <td>
                          <StatutBadge value={a.statut} /> <SituationBadge value={a.situation} />
                        </td>
                        <td>{leave ? CONGE_LABELS[leave.type] : "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {hasPermission(role, "dashboard.org") ? (
        <>
          <Card>
            <h3 style={{ marginBottom: 12 }}>Effectifs par statut</h3>
            <div className="grid grid-3">
              {(["fonctionnaire", "contractuel", "pigiste"] as const).map((s) => (
                <div key={s} className="kpi">
                  <span>{s}</span>
                  <strong>{state.agents.filter((a) => a.statut === s).length}</strong>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid grid-2">
            <Card>
              <h3 style={{ marginBottom: 12 }}>Avancements à venir</h3>
              {eligibles.length === 0 ? (
                <p className="muted">Aucune échéance immédiate.</p>
              ) : (
                eligibles.slice(0, 6).map((a) => (
                  <p key={a.id} style={{ marginBottom: 8 }}>
                    <Link className="link" href={`/agents/${a.id}`}>
                      {fullName(a)}
                    </Link>{" "}
                    · {a.categorie}
                    {a.classe}.{a.echelon}
                  </p>
                ))
              )}
            </Card>
            <Card>
              <h3 style={{ marginBottom: 12 }}>Courriers récents</h3>
              {state.courriers.slice(0, 5).map((c) => (
                <p key={c.id} style={{ marginBottom: 8 }}>
                  <Link className="link" href={`/courriers/${c.id}`}>
                    {c.reference}
                  </Link>{" "}
                  · {c.objet}
                </p>
              ))}
            </Card>
          </div>
        </>
      ) : null}
    </>
  );
}
