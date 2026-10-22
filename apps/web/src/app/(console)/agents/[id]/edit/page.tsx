"use client";

import { useParams } from "next/navigation";
import { AgentForm } from "@/components/AgentForm";
import { Alert, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import { fullName } from "@/lib/utils";

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentCompte } = useStore();
  const agent = state.agents.find((a) => a.id === id);
  if (!currentCompte || !hasPermission(currentCompte.role, "agents.write")) {
    return <Alert type="error">Modification réservée au service du personnel.</Alert>;
  }
  if (!agent) return <Empty title="Agent introuvable" />;
  return (
    <>
      <PageHeader title={`Modifier ${fullName(agent)}`} subtitle={agent.matricule} />
      <AgentForm initial={agent} isNew={false} />
    </>
  );
}
