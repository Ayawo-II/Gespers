"use client";

import { Badge } from "@/components/ui";
import {
  ETAT_CARRIERE_LABELS,
  TYPE_AGENT_LABELS,
  type EtatCarriere,
  type TypeAgent,
} from "@/lib/types";

export function StatutBadge({ value }: { value: TypeAgent | string }) {
  const norm = String(value).toUpperCase();
  const tone = norm === "FONCTIONNAIRE" ? "green" : norm === "CONTRACTUEL" ? "blue" : "gold";
  const label = TYPE_AGENT_LABELS[value] ?? TYPE_AGENT_LABELS[norm] ?? String(value);
  return <Badge tone={tone}>{label}</Badge>;
}

export function SituationBadge({ value }: { value: EtatCarriere | string }) {
  const norm = String(value).toUpperCase();
  const tone = norm === "TITULAIRE" ? "green" : norm === "STAGIAIRE" ? "gold" : "red";
  const label = ETAT_CARRIERE_LABELS[value] ?? ETAT_CARRIERE_LABELS[norm] ?? String(value);
  return <Badge tone={tone}>{label}</Badge>;
}
