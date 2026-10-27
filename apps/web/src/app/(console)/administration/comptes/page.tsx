"use client";

import { useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Empty, PageHeader } from "@/components/ui";
import { IconKey, IconPower } from "@/components/Icons";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import { ROLE_LABELS, ROLE_OPTIONS, type Role } from "@/lib/types";
import { fullName } from "@/lib/utils";

export default function ComptesPage() {
  const { state, setCompteActif, resetPassword, changeRole, currentCompte } =
    useStore();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [motifOuvert, setMotifOuvert] = useState<string | null>(null);
  const motifRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const canChangeRole = currentCompte
    ? hasPermission(currentCompte.role, "roles.manage")
    : false;

  const rows = useMemo(
    () => state.comptes.filter((c) => c.identifiant !== "systeme"),
    [state.comptes],
  );

  async function onRoleChange(compteId: string, role: Role) {
    setError("");
    setMsg("");
    const res = await changeRole(compteId, role);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(`Rôle mis à jour : ${ROLE_LABELS[role] ?? role}.`);
  }

  async function onSetActif(compteId: string, actif: boolean): Promise<boolean> {
    setError("");
    setMsg("");
    if (!actif && !motif[compteId]?.trim()) {
      setError("Un motif est obligatoire pour désactiver un compte.");
      return false;
    }
    const res = await setCompteActif(compteId, actif, motif[compteId]);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setMsg(actif ? "Compte réactivé." : "Compte désactivé.");
    return true;
  }

  async function onDesactiver(compteId: string) {
    if (await onSetActif(compteId, false)) setMotifOuvert(null);
  }

  function basculerMotif(compteId: string) {
    const ouverture = motifOuvert !== compteId;
    setMotifOuvert(ouverture ? compteId : null);
    if (ouverture) {
      requestAnimationFrame(() => motifRefs.current[compteId]?.focus());
    }
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
        subtitle="Désactivation motivée et réinitialisation des accès"
      />
      {msg ? <Alert>{msg}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <Card>
        {rows.length === 0 ? (
          <Empty
            title="Aucun compte"
            hint="Les comptes sont créés automatiquement avec les agents."
          />
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
                  const estSoi = c.id === currentCompte?.id;
                  return (
                    <tr key={c.id}>
                      <td>{c.identifiant}</td>
                      <td>{fullName(agent)}</td>
                      <td>
                        {canChangeRole && !estSoi ? (
                          <select
                            value={c.role}
                            onChange={(e) =>
                              onRoleChange(c.id, e.target.value as Role)
                            }
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r] ?? r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          ROLE_LABELS[c.role] ?? c.role
                        )}
                      </td>
                      <td>
                        {c.actif ? "Actif" : "Inactif"}
                        {c.motifDesactivation ? <div className="muted">{c.motifDesactivation}</div> : null}
                      </td>
                      <td>
                        <div className="actions">
                          {c.actif ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon"
                              title="Désactiver le compte"
                              aria-label="Désactiver le compte"
                              onClick={() => basculerMotif(c.id)}
                            >
                              <IconPower size={18} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon"
                              title="Réactiver le compte"
                              aria-label="Réactiver le compte"
                              onClick={() => onSetActif(c.id, true)}
                            >
                              <IconPower size={18} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            title="Réinitialiser le mot de passe"
                            aria-label="Réinitialiser le mot de passe"
                            onClick={() => onResetPassword(c)}
                          >
                            <IconKey size={18} />
                          </button>
                        </div>
                        <div
                          className={`motif-panel${
                            c.actif && motifOuvert === c.id ? " is-open" : ""
                          }`}
                        >
                          <div className="motif-panel-inner">
                            <div className="actions" style={{ marginTop: 8 }}>
                              <input
                                ref={(el) => {
                                  motifRefs.current[c.id] = el;
                                }}
                                tabIndex={motifOuvert === c.id ? undefined : -1}
                                placeholder="Motif de désactivation"
                                value={motif[c.id] ?? ""}
                                onChange={(e) =>
                                  setMotif((m) => ({ ...m, [c.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") onDesactiver(c.id);
                                }}
                              />
                              <Button
                                variant="danger"
                                onClick={() => onDesactiver(c.id)}
                              >
                                Désactiver
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setMotifOuvert(null)}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
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
    </>
  );
}
