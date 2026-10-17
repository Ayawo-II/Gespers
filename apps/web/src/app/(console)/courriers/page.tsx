"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { COURRIER_LABELS, type TypeCourrier } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";

export default function CourriersPage() {
  const { state, currentCompte } = useStore();
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "courriers.write") : false;
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | TypeCourrier>("");

  const rows = useMemo(() => {
    return state.courriers.filter((c) => {
      if (type && c.type !== type) return false;
      const hay = `${c.reference} ${c.objet} ${c.expediteur} ${c.destinataire}`.toLowerCase();
      return !q || hay.includes(q.toLowerCase());
    });
  }, [state.courriers, q, type]);

  return (
    <>
      <PageHeader
        title="Courriers du ministère"
        subtitle="Registre des correspondances, circulaires et arrêtés"
      >
        {canWrite ? <ButtonLink href="/courriers/nouveau">Enregistrer un courrier</ButtonLink> : null}
      </PageHeader>
      <Card>
        <div className="filters">
          <input placeholder="Référence, objet, expéditeur…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as "" | TypeCourrier)}>
            <option value="">Tous les types</option>
            {Object.entries(COURRIER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <Empty title="Aucun courrier" hint="Aucun enregistrement pour ces filtres." />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Référence</th>
                  <th>Type</th>
                  <th>Objet</th>
                  <th>Agent lié</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const agent = c.agentId ? state.agents.find((a) => a.id === c.agentId) : undefined;
                  return (
                    <tr key={c.id}>
                      <td>{formatDate(c.date)}</td>
                      <td>
                        <Link className="link" href={`/courriers/${c.id}`}>
                          {c.reference}
                        </Link>
                      </td>
                      <td>{COURRIER_LABELS[c.type]}</td>
                      <td>
                        {c.objet}
                        <div className="muted">
                          {c.expediteur} → {c.destinataire}
                        </div>
                      </td>
                      <td>{agent ? fullName(agent) : "—"}</td>
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
