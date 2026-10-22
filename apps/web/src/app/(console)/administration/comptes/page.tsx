"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { fullName, uid } from "@/lib/utils";

export default function ComptesPage() {
  const { state, saveCompte, setCompteActif, resetPassword } = useStore();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [agentId, setAgentId] = useState("");
  const [role, setRole] = useState<Role>("AGENT");

  const rows = useMemo(
    () => state.comptes.filter((c) => c.identifiant !== "systeme"),
    [state.comptes],
  );
  const agentsSansCompte = state.agents.filter(
    (a) => !rows.some((c) => c.agentId === a.id) && a.etatCarriere !== "SORTI",
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const res = await saveCompte(
      {
        id: uid("cpt"),
        identifiant: email,
        email,
        motDePasse: "",
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
    setMsg(
      res.temporaryPassword
        ? `Compte créé. Mot de passe temporaire : ${res.temporaryPassword}`
        : "Compte créé. Un mot de passe temporaire a été généré.",
    );
    setEmail("");
    setAgentId("");
  }

  async function onSetActif(compteId: string, actif: boolean) {
    setError("");
    setMsg("");
    if (!actif && !motif[compteId]?.trim()) {
      setError("Un motif est obligatoire pour désactiver un compte.");
      return;
    }
    const res = await setCompteActif(compteId, actif, motif[compteId]);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(actif ? "Compte réactivé." : "Compte désactivé.");
  }

  async function onResetPassword(compte: { id: string; identifiant: string }) {
    setError("");
    setMsg("");
    const res = await resetPassword(compte.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(`Mot de passe réinitialisé pour ${compte.identifiant} : ${res.password}`);
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
                              <Button variant="danger" onClick={() => onSetActif(c.id, false)}>
                                Désactiver
                              </Button>
                            </>
                          ) : (
                            <Button variant="secondary" onClick={() => onSetActif(c.id, true)}>
                              Réactiver
                            </Button>
                          )}
                          <Button variant="ghost" onClick={() => onResetPassword(c)}>
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
            <Field label="Adresse e-mail (identifiant)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@radiolome.tg"
                required
              />
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
                {["AGENT", "CHEF_SECTION", "CHEF_DIVISION", "RESPONSABLE_RH", "CHEF_PERSONNEL", "DG"].map((k) => (
                  <option key={k} value={k}>
                    {ROLE_LABELS[k] ?? k}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="muted">
            Un mot de passe temporaire est généré côté serveur et affiché après création.
          </p>
          <Button type="submit">Créer</Button>
        </form>
      </Card>
    </>
  );
}
