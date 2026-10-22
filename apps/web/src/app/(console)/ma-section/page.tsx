"use client";

import { PageHeader } from "@/components/ui";
import { TeamSections } from "@/components/TeamSections";
import { useStore } from "@/lib/store/api-store";
import { agentsDeMaSection, sectionsDuChef, vueSection } from "@/lib/visibility";

export default function MaSectionPage() {
  const { state, currentAgent } = useStore();
  if (!currentAgent) return null;

  const sections = sectionsDuChef(state.sections, currentAgent);
  const vues = sections.map((s) => vueSection(s, state.agents, state.affectations));
  const agents = agentsDeMaSection(state.agents, currentAgent);
  const effectif = vues.length
    ? vues.reduce((n, v) => n + v.membres.length, 0)
    : agents.length;

  return (
    <>
      <PageHeader
        title="Ma section"
        subtitle={`${currentAgent.fonction || currentAgent.poste} · ${currentAgent.service} · ${effectif} agent(s) · ${vues.length || 1} section(s)`}
      />
      {vues.length > 0 ? (
        <TeamSections sections={vues} />
      ) : (
        <TeamSections
          sections={[
            {
              section: {
                id: "ma-section",
                libelle: currentAgent.service || "Ma section",
                divisionId: "",
              },
              chef: currentAgent,
              membres: agents,
            },
          ]}
        />
      )}
    </>
  );
}
