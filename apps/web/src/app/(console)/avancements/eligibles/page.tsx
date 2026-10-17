"use client";

import Link from "next/link";
import { Alert, Button, Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import {
  formatDate,
  fullName,
  isEligibleClasse,
  isEligibleEchelon,
  nextEchelonDate,
  nextValue,
  todayIso,
} from "@/lib/utils";

export default function EligiblesPage() {
  const { state, currentCompte, enregistrerAvancement } = useStore();
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "avancements.write") : false;
  const rows = state.agents
    .filter((a) => a.situation !== "fin_parcours")
    .map((a) => ({
      agent: a,
      echelon: isEligibleEchelon(a, state.grille, state.avancements),
      classe: isEligibleClasse(a, state.grille, state.avancements),
      next: nextEchelonDate(a, state.grille, state.avancements),
    }))
    .filter((r) => r.echelon || r.classe);

  function appliquer(agentId: string, nature: "echelon" | "classe") {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return;
    const nouvelEchelon =
      nature === "echelon" ? nextValue(state.grille.echelons, agent.echelon) : state.grille.echelons[0];
    const nouvelleClasse =
      nature === "classe" ? nextValue(state.grille.classes, agent.classe) : agent.classe;
    enregistrerAvancement({
      agentId,
      dateEffet: todayIso(),
      ancienneCategorie: agent.categorie,
      nouvelleCategorie: agent.categorie,
      ancienneClasse: agent.classe,
      nouvelleClasse,
      ancienEchelon: agent.echelon,
      nouvelEchelon,
      type: "automatique",
      nature,
      justification: `Proposition automatique : durée réglementaire atteinte (${
        nature === "echelon" ? state.grille.dureeEchelonMois : state.grille.dureeClasseMois
      } mois).`,
    });
  }

  return (
    <>
      <PageHeader
        title="Agents éligibles"
        subtitle="Calcul automatique selon la grille (durées de classe et d'échelon)"
      />
      <Alert type="warn">
        Les propositions sont générées localement. L'application d'un avancement automatique est
        journalisée (auteur, date, ancienne et nouvelle situation).
      </Alert>
      <Card>
        {rows.length === 0 ? (
          <Empty title="Aucune éligibilité à cette date" hint="Les durées paramétrées n'ont pas encore été atteintes." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Situation actuelle</th>
                  <th>Échéance échelon</th>
                  <th>Proposition</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ agent, echelon, classe, next }) => (
                  <tr key={agent.id}>
                    <td>
                      <Link className="link" href={`/agents/${agent.id}`}>
                        {fullName(agent)}
                      </Link>
                    </td>
                    <td>
                      {agent.categorie}
                      {agent.classe}.{agent.echelon}
                    </td>
                    <td>{formatDate(next)}</td>
                    <td>
                      {echelon ? "Échelon" : ""} {classe ? "Classe" : ""}
                    </td>
                    <td>
                      {canWrite ? (
                        <div className="actions">
                          {echelon ? (
                            <Button onClick={() => appliquer(agent.id, "echelon")}>Appliquer échelon</Button>
                          ) : null}
                          {classe ? (
                            <Button onClick={() => appliquer(agent.id, "classe")}>Appliquer classe</Button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
