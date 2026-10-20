"use client";

import { PageHeader } from "@/components/ui";
import { TeamAgentsTable } from "@/components/TeamAgentsTable";
import { useStore } from "@/lib/mock/store";
import { agentsDeMaDivision } from "@/lib/visibility";

export default function MaDivisionPage() {
  const { state, currentAgent } = useStore();
  if (!currentAgent) return null;

  const agents = agentsDeMaDivision(state.agents, currentAgent);

  return (
    <>
      <PageHeader
        title="Ma division"
        subtitle={`${currentAgent.fonction || currentAgent.poste} · ${currentAgent.service} · ${agents.length} agent(s)`}
      />
      <TeamAgentsTable agents={agents} />
    </>
  );
}
