"use client";

import { AgentForm } from "@/components/AgentForm";
import { Alert, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";

export default function NouvelAgentPage() {
  const { currentCompte } = useStore();
  if (!currentCompte || !hasPermission(currentCompte.role, "agents.write")) {
    return <Alert type="error">Seul le responsable RH ou le chef du personnel peut enregistrer un agent.</Alert>;
  }
  return (
    <>
      <PageHeader
        title="Enregistrer un agent"
        subtitle="Identité, état civil, contact, formation et poste. Un dossier numérique est créé automatiquement."
      />
      <AgentForm isNew />
    </>
  );
}
