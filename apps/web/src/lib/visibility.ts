import type { Agent, Compte } from "@/lib/types";
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
