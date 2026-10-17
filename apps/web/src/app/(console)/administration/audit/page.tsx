"use client";

import { useMemo, useState } from "react";
import { Button, Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { downloadText, formatDateTime, toCsv } from "@/lib/utils";

export default function AuditPage() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  const actions = useMemo(
    () => Array.from(new Set(state.audit.map((a) => a.action))).sort(),
    [state.audit],
  );

  const rows = useMemo(() => {
    return state.audit.filter((e) => {
      if (action && e.action !== action) return false;
      const hay = `${e.identifiant ?? ""} ${e.action} ${e.cible} ${e.details} ${e.justification ?? ""}`.toLowerCase();
      return !q || hay.includes(q.toLowerCase());
    });
  }, [state.audit, q, action]);

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        subtitle="Connexions, créations, modifications, avancements et désactivations"
      >
        <Button
          variant="secondary"
          onClick={() =>
            downloadText(
              "audit-gespers.csv",
              toCsv(
                rows.map((e) => ({
                  date: e.date,
                  identifiant: e.identifiant ?? "",
                  action: e.action,
                  cible: e.cible,
                  details: e.details,
                  justification: e.justification ?? "",
                })),
              ),
            )
          }
        >
          Exporter CSV
        </Button>
      </PageHeader>
      <Card>
        <div className="filters">
          <input placeholder="Auteur, action, cible…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Toutes les actions</option>
            {actions.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <Empty title="Aucune entrée" />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Auteur</th>
                  <th>Action</th>
                  <th>Cible</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.date)}</td>
                    <td>{e.identifiant ?? "—"}</td>
                    <td>{e.action}</td>
                    <td>{e.cible}</td>
                    <td>
                      {e.details}
                      {e.justification ? <div className="muted">{e.justification}</div> : null}
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
