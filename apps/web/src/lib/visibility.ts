import type { Affectation, Agent, Compte, Division, Section } from "@/lib/types";
import { hasPermission } from "@/lib/rbac";

export function visibleAgents(all: Agent[], compte: Compte | null, self?: Agent | null) {
  if (!compte) return [];
  if (hasPermission(compte.role, "agents.read.all")) return all;
  if (hasPermission(compte.role, "agents.read.team") && self) {
    return all.filter((a) => a.id === self.id || a.chefId === self.id);
  }
  if (self) return all.filter((a) => a.id === self.id);
  return [];
}

export function canSeeAgent(agent: Agent, compte: Compte | null, self?: Agent | null) {
  return visibleAgents([agent], compte, self).length === 1;
}

/** Agents rattachés à la section d'un chef (lui-même + agents dont chefId = chef). */
export function agentsDeMaSection(agents: Agent[], self: Agent | null) {
  if (!self) return [];
  return agents.filter((a) => a.id === self.id || a.chefId === self.id);
}

/** Agents rattachés à la division d'un chef (lui-même, agents directs et agents des chefs de section de la division). */
export function agentsDeMaDivision(agents: Agent[], self: Agent | null) {
  if (!self) return [];
  const direct = agents.filter((a) => a.id === self.id || a.chefId === self.id);
  const chefsSectionIds = new Set(direct.map((a) => a.id));
  return agents.filter((a) => chefsSectionIds.has(a.id) || (a.chefId && chefsSectionIds.has(a.chefId)));
}

/** Division dont l'agent est le chef (à défaut, la division correspondant à son service). */
export function divisionDuChef(divisions: Division[], self: Agent | null): Division | null {
  if (!self) return null;
  const parChef = divisions.find((d) => d.chefId === self.id);
  if (parChef) return parChef;
  return divisions.find((d) => d.libelle === self.service) ?? null;
}

/** Sections dont l'agent est le chef de section. */
export function sectionsDuChef(sections: Section[], self: Agent | null): Section[] {
  if (!self) return [];
  return sections.filter((s) => s.chefId === self.id);
}

/**
 * Agents rattachés à une section : affectations déclarées, complétées par la
 * hiérarchie (agents dont chefId = chef de la section) pour les agents sans
 * affectation explicite. Un agent rattaché à une autre section n'est pas
 * compté comme membre de celle-ci.
 */
export function agentsDeSection(
  section: Section,
  agents: Agent[],
  affectations: Affectation[],
): Agent[] {
  const ids = new Set<string>();

  for (const aff of affectations) {
    if (aff.sectionId === section.id && aff.agentId) ids.add(aff.agentId);
  }

  if (section.chefId) {
    for (const agent of agents) {
      if (agent.chefId !== section.chefId) continue;
      const affecteAilleurs = affectations.some(
        (aff) => aff.agentId === agent.id && aff.sectionId && aff.sectionId !== section.id,
      );
      if (!affecteAilleurs) ids.add(agent.id);
    }
    ids.add(section.chefId);
  }

  return agents.filter((a) => ids.has(a.id));
}

/** Vue complète d'une section : responsable et membres. */
export interface VueSection {
  section: Section;
  chef: Agent | null;
  membres: Agent[];
}

export function vueSection(
  section: Section,
  agents: Agent[],
  affectations: Affectation[],
): VueSection {
  const membres = agentsDeSection(section, agents, affectations);
  return {
    section,
    chef: section.chefId ? agents.find((a) => a.id === section.chefId) ?? null : null,
    membres,
  };
}

/** Agents de la division qui ne sont rattachés à aucune de ses sections. */
export function agentsHorsSection(
  division: Division | null,
  vues: VueSection[],
  agents: Agent[],
): Agent[] {
  if (!division) return [];
  const dansSection = new Set(vues.flatMap((v) => v.membres.map((m) => m.id)));
  const candidats = agents.filter(
    (a) => a.service === division.libelle || a.chefId === division.chefId,
  );
  return candidats.filter((a) => !dansSection.has(a.id));
}
