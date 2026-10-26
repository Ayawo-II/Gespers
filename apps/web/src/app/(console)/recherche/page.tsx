"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, Empty, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/store/api-store";
import { COURRIER_LABELS, DOCUMENT_LABELS } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import { visibleAgents } from "@/lib/visibility";
import { apiFetch } from "@/services/api";

type SearchResult = {
  agents: Array<{
    id: number;
    nom: string;
    prenoms: string;
    matricule: string;
    fonction: string;
    categorie: string | null;
    classe: string | null;
    echelon: string | number | null;
  }>;
  courriers: Array<{ id: number; reference: string; type: string; date: string; objet: string }>;
  documents: Array<{
    id: number;
    titre: string;
    reference: string | null;
    dateDocument: string;
    dansRegistreGeneral: boolean;
  }>;
};

export default function RecherchePage() {
  const { state, currentCompte, currentAgent } = useStore();
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [apiResults, setApiResults] = useState<SearchResult | null>(null);

  const agents = visibleAgents(state.agents, currentCompte, currentAgent, {
    affectations: state.affectations,
    sections: state.sections,
    divisions: state.divisions,
  });
  const agentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);
  const hay = q.trim().toLowerCase();
  const hasApiQuery = hay.length >= 2;

  useEffect(() => {
    if (!hasApiQuery) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<{ data: SearchResult }>(
          `/api/v1/search?q=${encodeURIComponent(q.trim())}`,
        );
        if (!ctrl.signal.aborted) setApiResults(res.data);
      } catch {
        if (!ctrl.signal.aborted) setApiResults(null);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [q, hasApiQuery]);

  const agentRows = useMemo(() => {
    if (apiResults && hasApiQuery) {
      const apiAgents = apiResults.agents
        .map((a) => agents.find((x) => x.id === String(a.id)))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      return apiAgents.filter((a) => (service ? a.service === service : true));
    }
    return agents.filter((a) => {
      if (service && a.service !== service) return false;
      if (!hay) return true;
      const text = `${a.nom} ${a.prenoms} ${a.matricule} ${a.poste} ${a.service} ${a.formation} ${a.diplome}`.toLowerCase();
      return text.includes(hay);
    });
  }, [agents, hay, service, apiResults, hasApiQuery]);

  const courrierRows = useMemo(() => {
    if (apiResults && hasApiQuery) {
      return apiResults.courriers
        .map((c) => state.courriers.find((x) => x.id === String(c.id)))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
    }
    return state.courriers.filter((c) => {
      if (!hay) return false;
      const text = `${c.reference} ${c.objet} ${c.expediteur} ${c.destinataire} ${c.resume}`.toLowerCase();
      return text.includes(hay);
    });
  }, [state.courriers, hay, apiResults, hasApiQuery]);

  const docRows = useMemo(() => {
    if (apiResults && hasApiQuery) {
      return apiResults.documents
        .map((d) => state.documents.find((x) => x.id === String(d.id)))
        .filter((d): d is NonNullable<typeof d> => d !== undefined && agentIds.has(d.agentId));
    }
    return state.documents.filter((d) => {
      if (!agentIds.has(d.agentId)) return false;
      if (!hay) return false;
      const text = `${d.titre} ${DOCUMENT_LABELS[d.type]} ${d.versions.map((v) => v.nomFichier).join(" ")}`.toLowerCase();
      return text.includes(hay);
    });
  }, [state.documents, agentIds, hay, apiResults, hasApiQuery]);

  return (
    <>
      <PageHeader
        title="Recherche"
        subtitle="Agents du périmètre, courriers et pièces des dossiers numériques"
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
            {state.divisions.map((d) => (
              <option key={d.id} value={d.libelle}>
                {d.libelle}
              </option>
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
                      <StatutBadge value={a.statut ?? a.typeAgent} />
                    </td>
                    <td>
                      <SituationBadge value={a.situation ?? a.etatCarriere} />
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
                  <span className="muted"> · {agent ? fullName(agent) : ""}</span>
                </p>
              );
            })
          )}
        </Card>
      </div>
    </>
  );
}
