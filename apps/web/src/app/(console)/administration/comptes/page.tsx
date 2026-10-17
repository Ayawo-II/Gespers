"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { fullName, uid } from "@/lib/utils";
import { MOCK_PASSWORD } from "@/lib/mock/seed";

export default function ComptesPage() {
  const { state, saveCompte, setCompteActif, resetPassword } = useStore();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [identifiant, setIdentifiant] = useState("");
  const [agentId, setAgentId] = useState("");
  const [role, setRole] = useState<Role>("agent");

  const rows = useMemo(
    () => state.comptes.filter((c) => c.identifiant !== "systeme"),
    [state.comptes],
  );
  const agentsSansCompte = state.agents.filter(
    (a) => !rows.some((c) => c.agentId === a.id) && a.situation !== "fin_parcours",
  );

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = saveCompte(
      {
        id: uid("cpt"),
        identifiant,
        motDePasse: MOCK_PASSWORD,
        agentId,
        role,
        actif: true,
        tentativesEchouees: 0,
        createdAt: new Date().toISOString(),
      },
      true,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(`Compte créé. Mot de passe initial : ${MOCK_PASSWORD}`);
    setIdentifiant("");
    setAgentId("");
  }

  return (
    <>
      <PageHeader
        title="Comptes"
        subtitle="Création, désactivation motivée et réinitialisation des accès"
      />
      {msg ? <Alert>{msg}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <Card>
        {rows.length === 0 ? (
          <Empty title="Aucun compte" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>Agent</th>
                  <th>Rôle</th>
                  <th>État</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const agent = state.agents.find((a) => a.id === c.agentId);
                  return (
                    <tr key={c.id}>
                      <td>{c.identifiant}</td>
                      <td>{fullName(agent)}</td>
                      <td>{ROLE_LABELS[c.role]}</td>
                      <td>
                        {c.actif ? "Actif" : "Inactif"}
                        {c.motifDesactivation ? <div className="muted">{c.motifDesactivation}</div> : null}
                        {c.verrouilleJusqua ? (
                          <div className="muted">Verrouillé jusqu'à {new Date(c.verrouilleJusqua).toLocaleString("fr-TG")}</div>
                        ) : null}
                      </td>
                      <td>
                        <div className="actions" style={{ flexWrap: "wrap" }}>
                          {c.actif ? (
                            <>
                              <input
                                placeholder="Motif de désactivation"
                                value={motif[c.id] ?? ""}
                                onChange={(e) => setMotif((m) => ({ ...m, [c.id]: e.target.value }))}
                              />
                              <Button
                                variant="danger"
                                onClick={() => {
                                  if (!motif[c.id]?.trim()) {
                                    setError("Un motif est obligatoire pour désactiver un compte.");
                                    return;
                                  }
                                  setCompteActif(c.id, false, motif[c.id]);
                                  setMsg("Compte désactivé.");
                                }}
                              >
                                Désactiver
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setCompteActif(c.id, true);
                                setMsg("Compte réactivé.");
                              }}
                            >
                              Réactiver
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              const pwd = resetPassword(c.id);
                              setMsg(`Mot de passe réinitialisé pour ${c.identifiant} : ${pwd}`);
                            }}
                          >
                            Réinitialiser le mot de passe
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card>
        <h3>Créer un compte</h3>
        <form className="form" onSubmit={onCreate} style={{ marginTop: 12 }}>
          <div className="form-row-3">
            <Field label="Identifiant">
              <input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
            </Field>
            <Field label="Agent">
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} required>
                <option value="">Choisir…</option>
                {agentsSansCompte.map((a) => (
                  <option key={a.id} value={a.id}>
                    {fullName(a)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rôle">
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="muted">Le mot de passe initial est {MOCK_PASSWORD} (démonstration).</p>
          <Button type="submit">Créer</Button>
        </form>
      </Card>
    </>
  );
}
