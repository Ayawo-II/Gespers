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
