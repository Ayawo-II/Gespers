"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/mock/store";
import { CONGE_LABELS, DOCUMENT_LABELS } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";

export default function MonDossierPage() {
  const { state, currentAgent } = useStore();
  if (!currentAgent) return null;
  const docs = state.documents.filter((d) => d.agentId === currentAgent.id);
  const avs = state.avancements.filter((a) => a.agentId === currentAgent.id);
  const conges = state.conges.filter((c) => c.agentId === currentAgent.id);
  const affs = state.affectations.filter((a) => a.agentId === currentAgent.id);

  return (
    <>
      <PageHeader
        title="Mon dossier"
        subtitle={`${fullName(currentAgent)} · ${currentAgent.matricule}`}
      />
      <div className="grid grid-2">
        <Card>
          <h3>Identité</h3>
          <p style={{ marginTop: 8 }}>
            {fullName(currentAgent)} · {currentAgent.email}
          </p>
          <p className="muted">
            {currentAgent.telephone} · {currentAgent.adresse}
          </p>
          <p style={{ marginTop: 8 }}>
            <StatutBadge value={currentAgent.statut} />{" "}
            <SituationBadge value={currentAgent.situation} />
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            Catégorie {currentAgent.categorie} · classe {currentAgent.classe} · échelon{" "}
            {currentAgent.echelon}
          </p>
        </Card>
        <Card>
          <h3>Poste</h3>
          <p style={{ marginTop: 8 }}>
            {currentAgent.poste} — {currentAgent.service}
          </p>
          <p className="muted">Entrée en service le {formatDate(currentAgent.dateEntree)}</p>
        </Card>
      </div>
      <Card>
        <h3>Carrière</h3>
        <div className="timeline" style={{ marginTop: 12 }}>
          {avs.map((a) => (
            <div className="timeline-item" key={a.id}>
              <strong>
                {a.nature} {a.type} — {formatDate(a.dateEffet)}
              </strong>
              <p className="muted">{a.justification}</p>
            </div>
          ))}
          {affs.map((a) => (
            <div className="timeline-item" key={a.id}>
              <strong>
                Affectation {a.poste} — {formatDate(a.dateDebut)}
              </strong>
              <p className="muted">{a.service}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-2">
        <Card>
          <h3>Documents</h3>
          {docs.length === 0 ? (
            <p className="muted">Aucun fichier.</p>
          ) : (
            docs.map((d) => (
              <p key={d.id} style={{ marginTop: 8 }}>
                {d.titre} · {DOCUMENT_LABELS[d.type]}
              </p>
            ))
          )}
        </Card>
        <Card>
          <h3>Congés</h3>
          {conges.map((c) => (
            <p key={c.id} style={{ marginTop: 8 }}>
              {CONGE_LABELS[c.type]} · {formatDate(c.dateDebut)} – {formatDate(c.dateFin)}
            </p>
          ))}
        </Card>
      </div>
      <p className="muted">
        Consultation uniquement. Pour une mise à jour, contactez le service du personnel.{" "}
        <Link className="link" href="/tableau-de-bord">
          Retour au tableau de bord
        </Link>
      </p>
    </>
  );
}
