"use client";

import { AgentForm } from "@/components/AgentForm";
import { Alert, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";

export default function NouvelAgentPage() {
  const { currentCompte } = useStore();
  const canCreate =
    currentCompte &&
    (hasPermission(currentCompte.role, "agents.write") ||
      hasPermission(
        currentCompte.role,
        "agents.create.division",
        currentCompte.permissions,
      ));
  if (!canCreate) {
    return (
      <Alert type="error">
        Seul le responsable RH, le chef du personnel ou un chef de division
        ou de section habilité peut enregistrer un agent.
      </Alert>
    );
  }
  return (
    <div>
      <PageHeader
        title="Enregistrer un agent"
        subtitle="Identité, état civil, contact, formation et poste. Un dossier numérique est créé automatiquement."
      />
      <AgentForm isNew />
    </div>
  );
}
