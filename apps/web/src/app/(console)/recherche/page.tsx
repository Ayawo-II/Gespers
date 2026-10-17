"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, Empty, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/mock/store";
import { COURRIER_LABELS, DOCUMENT_LABELS, SERVICES } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import { visibleAgents } from "@/lib/visibility";

export default function RecherchePage() {
  const { state, currentCompte, currentAgent } = useStore();
  const [q, setQ] = useState("");
  const [service, setService] = useState("");

  const agents = visibleAgents(state.agents, currentCompte, currentAgent);
  const agentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);
  const hay = q.trim().toLowerCase();

  const agentRows = useMemo(() => {
    return agents.filter((a) => {
      if (service && a.service !== service) return false;
      if (!hay) return true;
      const text = `${a.nom} ${a.prenoms} ${a.matricule} ${a.poste} ${a.service} ${a.formation} ${a.diplome}`.toLowerCase();
      return text.includes(hay);
    });
  }, [agents, hay, service]);

  const courrierRows = useMemo(() => {
    return state.courriers.filter((c) => {
      if (!hay) return false;
      const text = `${c.reference} ${c.objet} ${c.expediteur} ${c.destinataire} ${c.resume}`.toLowerCase();
      return text.includes(hay);
    });
  }, [state.courriers, hay]);

  const docRows = useMemo(() => {
    return state.documents.filter((d) => {
      if (!agentIds.has(d.agentId)) return false;
      if (!hay) return false;
      const text = `${d.titre} ${DOCUMENT_LABELS[d.type]} ${d.versions.map((v) => v.nomFichier).join(" ")}`.toLowerCase();
      return text.includes(hay);
    });
  }, [state.documents, agentIds, hay]);

  return (
    <>
      <PageHeader
        title="Recherche"
        subtitle="Agents du périmètre, courriers du ministère et pièces des dossiers numériques"
      />
      <Card>
        <div className="filters">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, matricule, référence, objet, titre de pièce…"
          />
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Tous les services</option>
            {SERVICES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <h3>Agents ({agentRows.length})</h3>
        {agentRows.length === 0 ? (
          <Empty title="Aucun agent" hint="Élargissez les mots-clés ou le service." />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Agent</th>
                  <th>Statut</th>
                  <th>Situation</th>
                  <th>Service</th>
                </tr>
              </thead>
              <tbody>
                {agentRows.map((a) => (
                  <tr key={a.id}>
                    <td>{a.matricule}</td>
                    <td>
                      <Link className="link" href={`/agents/${a.id}`}>
                        {fullName(a)}
                      </Link>
                    </td>
                    <td>
                      <StatutBadge value={a.statut} />
                    </td>
                    <td>
                      <SituationBadge value={a.situation} />
                    </td>
                    <td>
                      {a.poste}
                      <div className="muted">{a.service}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-2">
        <Card>
          <h3>Courriers</h3>
          {courrierRows.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Saisissez un mot-clé pour interroger le registre.
            </p>
          ) : (
            courrierRows.map((c) => (
              <p key={c.id} style={{ marginTop: 8 }}>
                <Link className="link" href={`/courriers/${c.id}`}>
                  {c.reference}
                </Link>{" "}
                · {COURRIER_LABELS[c.type]} · {c.objet}
                <span className="muted"> · {formatDate(c.date)}</span>
              </p>
            ))
          )}
        </Card>
        <Card>
          <h3>Pièces numériques</h3>
          {docRows.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Aucune pièce ne correspond à la recherche.
            </p>
          ) : (
            docRows.map((d) => {
              const agent = state.agents.find((a) => a.id === d.agentId);
              return (
                <p key={d.id} style={{ marginTop: 8 }}>
                  <Link className="link" href={`/agents/${d.agentId}/dossier`}>
                    {d.titre}
                  </Link>{" "}
                  · {DOCUMENT_LABELS[d.type]}
                  <span className="muted"> · {fullName(agent)}</span>
                </p>
              );
            })
          )}
        </Card>
      </div>
    </>
  );
}
