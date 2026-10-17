"use client";

import Link from "next/link";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { formatDate, fullName } from "@/lib/utils";

export default function AvancementsPage() {
  const { state, currentCompte } = useStore();
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "avancements.write") : false;
  const rows = state.avancements;

  return (
    <>
      <PageHeader
        title="Avancements"
        subtitle="Historique des classes, échelons et changements de catégorie"
      >
        {canWrite ? (
          <>
            <ButtonLink href="/avancements/eligibles" variant="secondary">
              Propositions automatiques
            </ButtonLink>
            <ButtonLink href="/avancements/manuel">Avancement manuel</ButtonLink>
          </>
        ) : (
          <ButtonLink href="/avancements/eligibles" variant="secondary">
            Agents éligibles
          </ButtonLink>
        )}
      </PageHeader>
      <Card>
        {rows.length === 0 ? (
          <Empty title="Aucun avancement" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date d'effet</th>
                  <th>Agent</th>
                  <th>Nature</th>
                  <th>Type</th>
                  <th>Ancienne</th>
                  <th>Nouvelle</th>
                  <th>Justification</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const agent = state.agents.find((x) => x.id === a.agentId);
                  return (
                    <tr key={a.id}>
                      <td>{formatDate(a.dateEffet)}</td>
                      <td>
                        {agent ? (
                          <Link className="link" href={`/agents/${agent.id}/carriere`}>
                            {fullName(agent)}
                          </Link>
                        ) : (
                          a.agentId
                        )}
                      </td>
                      <td>{a.nature}</td>
                      <td>{a.type}</td>
                      <td>
                        {a.ancienneCategorie}
                        {a.ancienneClasse}.{a.ancienEchelon}
                      </td>
                      <td>
                        {a.nouvelleCategorie}
                        {a.nouvelleClasse}.{a.nouvelEchelon}
                      </td>
                      <td>{a.justification}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
