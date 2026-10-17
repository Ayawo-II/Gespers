"use client";

import { Badge } from "@/components/ui";
import {
  SITUATION_LABELS,
  STATUT_LABELS,
  type SituationService,
  type StatutAgent,
} from "@/lib/types";

export function StatutBadge({ value }: { value: StatutAgent }) {
  const tone = value === "fonctionnaire" ? "green" : value === "contractuel" ? "blue" : "gold";
  return <Badge tone={tone}>{STATUT_LABELS[value]}</Badge>;
}

export function SituationBadge({ value }: { value: SituationService }) {
  const tone = value === "titulaire" ? "green" : value === "stagiaire" ? "gold" : "red";
  return <Badge tone={tone}>{SITUATION_LABELS[value]}</Badge>;
}
