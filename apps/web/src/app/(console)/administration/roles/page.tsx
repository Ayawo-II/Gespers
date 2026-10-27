"use client";

import { useState } from "react";
import { Alert, Button, Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { fullName } from "@/lib/utils";

const DELEGATED_PERMISSION = "agents.create.division";

export default function AccesPage() {
  const { state, setComptePermissions } = useStore();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const chefs = state.comptes.filter(
    (c) =>
      c.identifiant !== "systeme" &&
      (c.role === "CHEF_DIVISION" || c.role === "CHEF_SECTION"),
  );

  function perimetre(agentId: string) {
    const division = state.divisions.find((d) => d.chefId === agentId);
    if (division) return `Division : ${division.libelle}`;
    const section = state.sections.find((s) => s.chefId === agentId);
    if (section) return `Section : ${section.libelle}`;
    return "Aucun périmètre";
  }

  async function toggle(
    compteId: string,
    identifiant: string,
    hasAccess: boolean,
  ) {
    setMsg("");
    setError("");
    const compte = state.comptes.find((c) => c.id === compteId);
    const current = compte?.permissions ?? [];
    const next = hasAccess
      ? current.filter((p) => p !== DELEGATED_PERMISSION)
      : [...current, DELEGATED_PERMISSION];
    const res = await setComptePermissions(compteId, next);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(
      hasAccess
        ? `Accès révoqué pour ${identifiant}.`
        : `Accès accordé à ${identifiant}.`,
    );
  }

  return (
    <>
      <PageHeader
        title="Accès"
        subtitle="Accorder ou révoquer le droit d'ajouter des membres aux chefs de division et de section"
      />
      {msg ? <Alert>{msg}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <Card>
        <h3>Ajout de membres</h3>
        <p className="muted">
          Un chef autorisé ne peut enregistrer un nouvel agent que dans son
          propre périmètre : sa division, ou sa section.
        </p>
        {chefs.length === 0 ? (
          <Empty title="Aucun chef de division ou de section" />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>Agent</th>
                  <th>Périmètre</th>
                  <th>Ajout de membres</th>
                </tr>
              </thead>
              <tbody>
                {chefs.map((c) => {
                  const agent = state.agents.find((a) => a.id === c.agentId);
                  const hasAccess =
                    c.permissions?.includes(DELEGATED_PERMISSION) ?? false;
                  return (
                    <tr key={c.id}>
                      <td>{c.identifiant}</td>
                      <td>{fullName(agent)}</td>
                      <td>{perimetre(c.agentId)}</td>
                      <td>
                        <Button
                          variant={hasAccess ? "danger" : "primary"}
                          onClick={() => toggle(c.id, c.identifiant, hasAccess)}
                        >
                          {hasAccess ? "Révoquer" : "Accorder"}
                        </Button>
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
