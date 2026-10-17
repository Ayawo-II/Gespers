import type { Agent, Conge, GrilleAvancement } from "@/lib/types";

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function fullName(agent?: Agent | null) {
  if (!agent) return "—";
  return `${agent.prenoms} ${agent.nom}`;
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

export function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDate(iso);
  return date.toLocaleString("fr-TG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysBetween(start: string, end: string) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

export function addMonths(isoDate: string, months: number) {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function congeOverlap(existing: Conge[], agentId: string, start: string, end: string, ignoreId?: string) {
  return existing.filter(
    (c) =>
      c.agentId === agentId &&
      c.id !== ignoreId &&
      overlaps(c.dateDebut, c.dateFin, start, end),
  );
}

export function lastAvancementDate(agent: Agent, avancements: { agentId: string; dateEffet: string }[]) {
  const dates = avancements
    .filter((a) => a.agentId === agent.id)
    .map((a) => a.dateEffet)
    .sort();
  return dates.at(-1) ?? agent.dateEntree;
}

export function nextEchelonDate(agent: Agent, grille: GrilleAvancement, avancements: { agentId: string; dateEffet: string }[]) {
  return addMonths(lastAvancementDate(agent, avancements), grille.dureeEchelonMois);
}

export function isEligibleEchelon(agent: Agent, grille: GrilleAvancement, avancements: { agentId: string; dateEffet: string }[]) {
  if (agent.situation === "fin_parcours") return false;
  const lastEch = grille.echelons[grille.echelons.length - 1];
  if (agent.echelon === lastEch) return false;
  return nextEchelonDate(agent, grille, avancements) <= todayIso();
}

export function isEligibleClasse(agent: Agent, grille: GrilleAvancement, avancements: { agentId: string; dateEffet: string }[]) {
  if (agent.situation === "fin_parcours") return false;
  const lastEch = grille.echelons[grille.echelons.length - 1];
  const lastCl = grille.classes[grille.classes.length - 1];
  if (agent.echelon !== lastEch) return false;
  if (agent.classe === lastCl) return false;
  return addMonths(lastAvancementDate(agent, avancements), grille.dureeClasseMois) <= todayIso();
}

export function nextValue(list: string[], current: string) {
  const i = list.indexOf(current);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : current;
}

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(";"))].join("\n");
}

export function initials(agent: Agent) {
  return `${agent.prenoms[0] ?? ""}${agent.nom[0] ?? ""}`.toUpperCase();
}
