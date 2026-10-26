"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { StatutBadge } from "@/components/status";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import { CLASSE_LABELS } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { visibleAgents } from "@/lib/visibility";

export default function AgentsPage() {
  const { state, currentCompte, currentAgent } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [typeAgentFilter, setTypeAgentFilter] = useState<string>("");
  const [service, setService] = useState("");
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "agents.write") : false;
  const canExport = currentCompte ? hasPermission(currentCompte.role, "export") : false;

  const rows = useMemo(() => {
    return visibleAgents(state.agents, currentCompte, currentAgent, {
      affectations: state.affectations,
      sections: state.sections,
      divisions: state.divisions,
    }).filter((a) => {
      const hay = `${a.nom} ${a.prenoms} ${a.matricule} ${a.fonction || a.poste}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (typeAgentFilter) {
        const normFilter = typeAgentFilter.toUpperCase();
        const agentTypeNorm = String(a.typeAgent || a.statut).toUpperCase();
        if (normFilter === "FONCTIONNAIRE" && agentTypeNorm !== "FONCTIONNAIRE") return false;
        if (normFilter === "CONTRACTUEL" && agentTypeNorm !== "CONTRACTUEL") return false;
        if (normFilter === "PIGISTE" && agentTypeNorm !== "PIGISTE") return false;
      }
      if (service && a.service !== service) return false;
      return true;
    });
  }, [
    state.agents,
    currentCompte,
    currentAgent,
    q,
    typeAgentFilter,
    service,
    state.affectations,
    state.sections,
    state.divisions,
  ]);

  return (
    <>
      <PageHeader title="Agents" subtitle="Cycle de vie administratif du personnel de Radio Lomé">
        {canExport ? (
          <button
            className="btn btn-secondary"
            onClick={async () => {
              try {
                const { apiDownload, triggerBrowserDownload } = await import("@/services/api");
                const blob = await apiDownload("/api/v1/exports/agents.csv");
                triggerBrowserDownload(blob, "agents-radio-lome.csv");
              } catch (error) {
                console.error(error);
              }
            }}
          >
            Exporter CSV
          </button>
        ) : null}
        {canWrite ? <ButtonLink href="/agents/nouveau">Enregistrer un agent</ButtonLink> : null}
      </PageHeader>
      <Card>
        <div className="filters">
          <input placeholder="Nom, prénom, matricule, fonction…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={typeAgentFilter} onChange={(e) => setTypeAgentFilter(e.target.value)}>
            <option value="">Tous les statuts d&apos;agent</option>
            <option value="FONCTIONNAIRE">Fonctionnaire</option>
            <option value="CONTRACTUEL">Contractuel</option>
            <option value="PIGISTE">Pigiste (Pivoté)</option>
          </select>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Tous les services</option>
            {state.divisions.map((d) => (
              <option key={d.id} value={d.libelle}>
                {d.libelle}
              </option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <Empty title="Aucun agent" hint="Aucun résultat pour ces filtres." />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Agent</th>
                  <th>Type Agent</th>
                  <th>Grade & Position</th>
                  <th>Service / Fonction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/agents/${a.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{a.matricule}</td>
                    <td>
                      <strong>{fullName(a)}</strong>
                    </td>
                    <td>
                      <StatutBadge value={a.typeAgent || a.statut} />
                    </td>
                    <td>
                      Cat. {a.categorie} · {CLASSE_LABELS[a.classe] ?? a.classe} · Éch. {a.echelon}
                    </td>
                    <td>
                      {a.fonction || a.poste}
                      <div className="muted">{a.service}</div>
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
