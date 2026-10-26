import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export async function getDashboardSummary(_req: Request, res: Response) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const surveillanceEnd = new Date(today);
  surveillanceEnd.setUTCDate(surveillanceEnd.getUTCDate() + 90);

  const [
    total,
    actifs,
    titulaires,
    effectifsByType,
    effectifsByEtat,
    eligibleForAdvancement,
    affectations,
  ] = await Promise.all([
    prisma.personnes.count(),
    prisma.personnes.count({ where: { estArchive: false, etatCarriere: { not: "SORTI" } } }),
    prisma.personnes.count({ where: { estArchive: false, etatCarriere: "TITULAIRE" } }),
    prisma.personnes.groupBy({
      by: ["typeAgent"],
      where: { estArchive: false },
      _count: { _all: true },
    }),
    prisma.personnes.groupBy({
      by: ["etatCarriere"],
      where: { estArchive: false },
      _count: { _all: true },
    }),
    prisma.personnes.findMany({
      where: {
        estArchive: false,
        typeAgent: "FONCTIONNAIRE",
        etatCarriere: "TITULAIRE",
        echelon: { not: null },
      },
      select: { dateDernierAvancement: true, dateEntree: true },
    }),
    prisma.affectation.findMany({
      where: {
        personne: {
          is: { estArchive: false, etatCarriere: { not: "SORTI" } },
        },
      },
      select: {
        personneId: true,
        section: {
          select: { division: { select: { id: true, libelle: true } } },
        },
      },
    }),
  ]);

  const duration = 24;
  let enRetard = 0;
  let aSurveiller = 0;
  for (const agent of eligibleForAdvancement) {
    const dueDate = addMonths(agent.dateDernierAvancement ?? agent.dateEntree, duration);
    if (dueDate < today) enRetard += 1;
    else if (dueDate <= surveillanceEnd) aSurveiller += 1;
  }

  const divisions = new Map<number, { id: number; libelle: string; personneIds: Set<number> }>();
  for (const affectation of affectations) {
    const division = affectation.section.division;
    const item = divisions.get(division.id) ?? {
      id: division.id,
      libelle: division.libelle,
      personneIds: new Set<number>(),
    };
    item.personneIds.add(affectation.personneId);
    divisions.set(division.id, item);
  }

  res.json({
    data: {
      effectifTotal: total,
      agentsActifs: actifs,
      tauxTitularisation: actifs === 0 ? 0 : Math.round((titulaires / actifs) * 10000) / 100,
      avancementsEnRetard: enRetard,
      avancementsASurveiller: aSurveiller,
      repartitionTypeAgent: effectifsByType.map(({ typeAgent, _count }) => ({
        typeAgent,
        total: _count._all,
      })),
      repartitionEtatCarriere: effectifsByEtat.map(({ etatCarriere, _count }) => ({
        etatCarriere,
        total: _count._all,
      })),
      repartitionDivision: [...divisions.values()]
        .map(({ id, libelle, personneIds }) => ({
          divisionId: id,
          division: libelle,
          total: personneIds.size,
        }))
        .sort((a, b) => a.division.localeCompare(b.division, "fr")),
    },
  });
}
