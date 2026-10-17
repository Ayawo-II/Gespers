"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { SERVICES, type StatutAgent } from "@/lib/types";
import { downloadText, formatDate, fullName, toCsv } from "@/lib/utils";
import { visibleAgents } from "@/lib/visibility";

export default function AgentsPage() {
  const { state, currentCompte, currentAgent } = useStore();
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<"" | StatutAgent>("");
  const [service, setService] = useState("");
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "agents.write") : false;
  const canExport = currentCompte ? hasPermission(currentCompte.role, "export") : false;

  const rows = useMemo(() => {
    return visibleAgents(state.agents, currentCompte, currentAgent).filter((a) => {
      const hay = `${a.nom} ${a.prenoms} ${a.matricule} ${a.poste}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (statut && a.statut !== statut) return false;
      if (service && a.service !== service) return false;
      return true;
    });
  }, [state.agents, currentCompte, currentAgent, q, statut, service]);

  return (
    <>
      <PageHeader title="Agents" subtitle="Cycle de vie administratif du personnel de Radio Lomé">
        {canExport ? (
          <button
            className="btn btn-secondary"
            onClick={() =>
              downloadText(
                "agents-radio-lome.csv",
                toCsv(
                  rows.map((a) => ({
                    matricule: a.matricule,
                    nom: a.nom,
                    prenoms: a.prenoms,
                    statut: a.statut,
                    situation: a.situation,
                    service: a.service,
                    poste: a.poste,
                    categorie: a.categorie,
                    classe: a.classe,
                    echelon: a.echelon,
                  })),
                ),
              )
            }
          >
            Exporter CSV
          </button>
        ) : null}
        {canWrite ? <ButtonLink href="/agents/nouveau">Enregistrer un agent</ButtonLink> : null}
      </PageHeader>
      <Card>
        <div className="filters">
          <input placeholder="Nom, prénom, matricule…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={statut} onChange={(e) => setStatut(e.target.value as "" | StatutAgent)}>
            <option value="">Tous les statuts</option>
            <option value="fonctionnaire">Fonctionnaire</option>
            <option value="contractuel">Contractuel</option>
            <option value="pigiste">Pigiste</option>
          </select>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Tous les services</option>
            {SERVICES.map((s) => (
              <option key={s}>{s}</option>
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
                  <th>Statut</th>
                  <th>Situation</th>
                  <th>Position</th>
                  <th>Service</th>
                  <th>Entrée</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
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
                      {a.categorie}
                      {a.classe}.{a.echelon}
                    </td>
                    <td>
                      {a.poste}
                      <div className="muted">{a.service}</div>
                    </td>
                    <td>{formatDate(a.dateEntree)}</td>
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
