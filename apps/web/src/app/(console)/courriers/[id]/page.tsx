"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CourrierForm } from "@/components/CourrierForm";
import { Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import { COURRIER_LABELS } from "@/lib/types";
import { formatDate, formatDateTime, fullName } from "@/lib/utils";

export default function CourrierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentCompte } = useStore();
  const courrier = state.courriers.find((c) => c.id === id);
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "courriers.write") : false;

  if (!courrier) return <Empty title="Courrier introuvable" />;

  const agent = courrier.agentId ? state.agents.find((a) => a.id === courrier.agentId) : undefined;
  const auteur = state.comptes.find((c) => c.id === courrier.auteurId);

  return (
    <>
      <PageHeader title={courrier.reference} subtitle={COURRIER_LABELS[courrier.type]} />
      <div className="grid grid-2">
        <Card>
          <h3>Objet</h3>
          <p style={{ marginTop: 8 }}>{courrier.objet}</p>
          <p className="muted" style={{ marginTop: 8 }}>
            {formatDate(courrier.date)} · {courrier.expediteur} → {courrier.destinataire}
          </p>
          {courrier.service ? <p className="muted">Service : {courrier.service}</p> : null}
          {agent ? (
            <p style={{ marginTop: 8 }}>
              Agent concerné :{" "}
              <Link className="link" href={`/agents/${agent.id}`}>
                {fullName(agent)}
              </Link>
            </p>
          ) : null}
        </Card>
        <Card>
          <h3>Traçabilité</h3>
          <p style={{ marginTop: 8 }}>Enregistré le {formatDateTime(courrier.createdAt)}</p>
          <p className="muted">{auteur?.identifiant ?? courrier.auteurId}</p>
          {courrier.pieceJointe ? <p className="muted">Pièce : {courrier.pieceJointe}</p> : null}
        </Card>
      </div>
      <Card>
        <h3>Résumé</h3>
        <p style={{ marginTop: 8 }}>{courrier.resume || "—"}</p>
      </Card>
      {canWrite ? (
        <>
          <PageHeader title="Modifier" />
          <CourrierForm isNew={false} initial={courrier} />
        </>
      ) : null}
    </>
  );
}
