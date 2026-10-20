"use client";

import { PageHeader } from "@/components/ui";
import { TeamAgentsTable } from "@/components/TeamAgentsTable";
import { useStore } from "@/lib/mock/store";
import { agentsDeMaSection } from "@/lib/visibility";

export default function MaSectionPage() {
  const { state, currentAgent } = useStore();
  if (!currentAgent) return null;

  const agents = agentsDeMaSection(state.agents, currentAgent);

  return (
    <>
      <PageHeader
        title="Ma section"
        subtitle={`${currentAgent.fonction || currentAgent.poste} · ${currentAgent.service} · ${agents.length} agent(s)`}
      />
      <TeamAgentsTable agents={agents} />
    </>
  );
}
