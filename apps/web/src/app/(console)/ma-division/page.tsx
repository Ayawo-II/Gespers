"use client";

import { PageHeader } from "@/components/ui";
import { TeamSections } from "@/components/TeamSections";
import { useStore } from "@/lib/mock/store";
import {
  agentsHorsSection,
  divisionDuChef,
  vueSection,
} from "@/lib/visibility";

export default function MaDivisionPage() {
  const { state, currentAgent } = useStore();
  if (!currentAgent) return null;

  const division = divisionDuChef(state.divisions, currentAgent);
  const sections = division
    ? state.sections.filter((s) => s.divisionId === division.id)
    : [];
  const vues = sections.map((s) => vueSection(s, state.agents, state.affectations));
  const horsSection = agentsHorsSection(division, vues, state.agents);
  const effectif = vues.reduce((n, v) => n + v.membres.length, 0) + horsSection.length;

  return (
    <>
      <PageHeader
        title="Ma division"
        subtitle={`${currentAgent.fonction || currentAgent.poste} · ${division?.libelle ?? currentAgent.service} · ${effectif} agent(s) · ${vues.length} section(s)`}
      />
      <TeamSections sections={vues} horsSection={horsSection} />
    </>
  );
}
