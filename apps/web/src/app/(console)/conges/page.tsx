"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { CONGE_LABELS, type TypeConge } from "@/lib/types";
import { daysBetween, downloadText, formatDate, fullName, toCsv, todayIso, uid } from "@/lib/utils";
import { visibleAgents } from "@/lib/visibility";

export default function CongesPage() {
  const { state, currentCompte, currentAgent, saveConge } = useStore();
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "conges.write") : false;
  const canAll = currentCompte ? hasPermission(currentCompte.role, "conges.read.all") : false;
  const team = visibleAgents(state.agents, currentCompte, currentAgent);
  const scope = canAll ? state.agents : team;
  const scopeIds = useMemo(() => new Set(scope.map((a) => a.id)), [scope]);

  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | TypeConge>("");
  const [agentId, setAgentId] = useState("");
  const [dateDebut, setDateDebut] = useState(todayIso());
  const [dateFin, setDateFin] = useState(todayIso());
  const [congeType, setCongeType] = useState<TypeConge>("annuel");
  const [reference, setReference] = useState("");
  const [piece, setPiece] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    return state.conges.filter((c) => {
      if (!scopeIds.has(c.agentId)) return false;
      if (type && c.type !== type) return false;
      const agent = state.agents.find((a) => a.id === c.agentId);
      const hay = `${fullName(agent)} ${c.referenceDecision} ${CONGE_LABELS[c.type]}`.toLowerCase();
      return !q || hay.includes(q.toLowerCase());
    });
  }, [state.conges, state.agents, scopeIds, type, q]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const res = saveConge({
      id: uid("cg"),
      agentId,
      type: congeType,
      dateDebut,
      dateFin,
      dureeJours: daysBetween(dateDebut, dateFin),
      referenceDecision: reference,
      pieceJointe: piece || undefined,
      auteurId: currentCompte?.id ?? "cpt-systeme",
      createdAt: new Date().toISOString(),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg("Congé enregistré.");
    setReference("");
    setPiece("");
  }

  return (
    <>
      <PageHeader
        title="Congés et permissions"
        subtitle="Décisions déjà prises : le logiciel n'instruit pas les demandes"
      >
        {hasPermission(currentCompte?.role ?? "agent", "export") ? (
          <button
            className="btn btn-secondary"
            onClick={() =>
              downloadText(
                "conges-radio-lome.csv",
                toCsv(
                  rows.map((c) => {
                    const a = state.agents.find((x) => x.id === c.agentId);
                    return {
                      agent: fullName(a),
                      type: CONGE_LABELS[c.type],
                      debut: c.dateDebut,
                      fin: c.dateFin,
                      jours: c.dureeJours,
                      reference: c.referenceDecision,
                    };
                  }),
                ),
              )
            }
          >
            Exporter CSV
          </button>
        ) : null}
      </PageHeader>
      <Card>
        <div className="filters">
          <input placeholder="Agent, référence…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as "" | TypeConge)}>
            <option value="">Tous les types</option>
            {Object.entries(CONGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <Empty title="Aucun congé" />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Durée</th>
                  <th>Décision</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const agent = state.agents.find((a) => a.id === c.agentId);
                  return (
                    <tr key={c.id}>
                      <td>
                        {agent ? (
                          <Link className="link" href={`/agents/${agent.id}`}>
                            {fullName(agent)}
                          </Link>
                        ) : (
                          c.agentId
                        )}
                      </td>
                      <td>{CONGE_LABELS[c.type]}</td>
                      <td>
                        {formatDate(c.dateDebut)} – {formatDate(c.dateFin)}
                      </td>
                      <td>{c.dureeJours} j</td>
                      <td>{c.referenceDecision}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {canWrite ? (
        <Card>
          <h3>Enregistrer une décision</h3>
          {msg ? <Alert>{msg}</Alert> : null}
          {error ? <Alert type="error">{error}</Alert> : null}
          <form className="form" onSubmit={onSubmit} style={{ marginTop: 12 }}>
            <div className="form-row">
              <Field label="Agent">
                <select value={agentId} onChange={(e) => setAgentId(e.target.value)} required>
                  <option value="">Choisir…</option>
                  {scope
                    .filter((a) => a.situation !== "fin_parcours")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {fullName(a)} — {a.matricule}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Type">
                <select value={congeType} onChange={(e) => setCongeType(e.target.value as TypeConge)}>
                  {Object.entries(CONGE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row-3">
              <Field label="Début">
                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
              </Field>
              <Field label="Fin">
                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} required />
              </Field>
              <Field label="Durée calculée">
                <input readOnly value={`${daysBetween(dateDebut, dateFin)} jour(s)`} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Référence de la décision">
                <input value={reference} onChange={(e) => setReference(e.target.value)} required />
              </Field>
              <Field label="Pièce jointe (optionnel)">
                <input value={piece} onChange={(e) => setPiece(e.target.value)} />
              </Field>
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </Card>
      ) : null}
    </>
  );
}
