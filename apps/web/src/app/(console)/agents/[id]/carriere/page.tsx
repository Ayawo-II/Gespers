"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { formatDate, formatDateTime, fullName } from "@/lib/utils";
import { canSeeAgent } from "@/lib/visibility";

export default function CarrierePage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentCompte, currentAgent } = useStore();
  const agent = state.agents.find((a) => a.id === id);
  if (!agent || !canSeeAgent(agent, currentCompte, currentAgent)) {
    return <Empty title="Carrière inaccessible" />;
  }
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "avancements.write") : false;
  const avs = state.avancements.filter((a) => a.agentId === agent.id);
  const affs = state.affectations.filter((a) => a.agentId === agent.id);

  return (
    <>
      <PageHeader
        title={`Carrière — ${fullName(agent)}`}
        subtitle="Affectations, statuts, classes, échelons et catégories"
      >
        {canWrite ? (
          <ButtonLink href={`/avancements/manuel?agentId=${agent.id}`}>Avancement manuel</ButtonLink>
        ) : null}
      </PageHeader>
      <div className="grid grid-2">
        <Card>
          <h3>Avancements</h3>
          {avs.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Aucun avancement historisé.
            </p>
          ) : (
            <div className="timeline" style={{ marginTop: 12 }}>
              {avs.map((a) => (
                <div className="timeline-item" key={a.id}>
                  <strong>
                    {a.nature} · {a.type} · {formatDate(a.dateEffet)}
                  </strong>
                  <p>
                    {a.ancienneCategorie}
                    {a.ancienneClasse}.{a.ancienEchelon} → {a.nouvelleCategorie}
                    {a.nouvelleClasse}.{a.nouvelEchelon}
                  </p>
                  <p className="muted">{a.justification}</p>
                  <p className="muted">{formatDateTime(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3>Affectations</h3>
          {affs.map((a) => (
            <div className="timeline-item" key={a.id} style={{ marginTop: 12 }}>
              <strong>
                {a.poste} · {formatDate(a.dateDebut)}
                {a.dateFin ? ` – ${formatDate(a.dateFin)}` : " – en cours"}
              </strong>
              <p className="muted">{a.service}</p>
            </div>
          ))}
        </Card>
      </div>
      <p>
        <Link className="link" href={`/agents/${agent.id}`}>
          Fiche agent
        </Link>
      </p>
    </>
  );
}
