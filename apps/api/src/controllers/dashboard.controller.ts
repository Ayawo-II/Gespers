import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { agentReadWhere } from "../services/agent-access.js";
import {
  careerPlanSelect,
  getAdvancementDates,
} from "../services/avancements-planning.js";
import { calculateAnnualLeaveBalance } from "../services/conges.service.js";

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
    grille,
    eligibleForAdvancement,
    affectations,
    comptesActifs,
    comptesInactifs,
    courriersRecents,
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
    prisma.grilleAvancement.findUnique({
      where: { id: 1 },
      select: { dureeEchelonMois: true, dureeClasseMois: true, echelons: true, classes: true },
    }),
    prisma.personnes.findMany({
      where: {
        estArchive: false,
        typeAgent: "FONCTIONNAIRE",
        etatCarriere: "TITULAIRE",
        categorie: { not: null },
        classe: { not: null },
        echelon: { not: null },
      },
      select: careerPlanSelect,
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
    prisma.utilisateur.count({ where: { isActive: true } }),
    prisma.utilisateur.count({ where: { isActive: false } }),
    prisma.courrier.findMany({
      take: 10,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      select: { id: true, reference: true, type: true, date: true, objet: true },
    }),
  ]);

  const duration = grille?.dureeEchelonMois ?? 24;
  const classDuration = grille?.dureeClasseMois ?? 36;
  let enRetard = 0;
  let aSurveiller = 0;
  let classesEnRetard = 0;
  let classesASurveiller = 0;
  let echelonsEnRetard = 0;
  let echelonsASurveiller = 0;
  for (const agent of eligibleForAdvancement) {
    const dates = getAdvancementDates(agent, duration, classDuration);
    const echelonIndex = grille?.echelons.indexOf(String(agent.echelon)) ?? -1;
    const classIndex = grille?.classes.indexOf(agent.classe!) ?? -1;
    const canAdvanceEchelon =
      echelonIndex >= 0 && echelonIndex < (grille?.echelons.length ?? 0) - 1;
    const canAdvanceClass =
      classIndex >= 0 && classIndex < (grille?.classes.length ?? 0) - 1;
    const overdueEchelon = canAdvanceEchelon && dates.echelon < today;
    const overdueClass =
      canAdvanceClass && dates.classe !== null && dates.classe < today;
    const soonEchelon =
      canAdvanceEchelon &&
      dates.echelon >= today &&
      dates.echelon <= surveillanceEnd;
    const soonClass =
      canAdvanceClass &&
      dates.classe !== null &&
      dates.classe >= today &&
      dates.classe <= surveillanceEnd;
    if (overdueEchelon || overdueClass) enRetard += 1;
    else if (soonEchelon || soonClass) aSurveiller += 1;
    if (overdueEchelon) echelonsEnRetard += 1;
    else if (soonEchelon) echelonsASurveiller += 1;
    if (overdueClass) classesEnRetard += 1;
    else if (soonClass) classesASurveiller += 1;
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
      classesEnRetard,
      classesASurveiller,
      echelonsEnRetard,
      echelonsASurveiller,
      comptesActifs,
      comptesInactifs,
      courriersRecents: courriersRecents.map((courrier) => ({
        ...courrier,
        date: courrier.date.toISOString().slice(0, 10),
      })),
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

export async function getPersonalDashboard(_req: Request, res: Response) {
  const user = getAuthenticatedUser(res);
  const [personne, grid, policy] = await Promise.all([
    prisma.personnes.findUnique({
      where: { id: user.personneId },
      select: {
        id: true,
        nom: true,
        prenoms: true,
        matricule: true,
        fonction: true,
        typeAgent: true,
        etatCarriere: true,
        categorie: true,
        classe: true,
        echelon: true,
        dateEntree: true,
        dateDernierAvancement: true,
        titularisation: { select: { dateEffet: true, referenceDecision: true } },
        historique: {
          where: { nature: "CLASSE" },
          orderBy: [{ dateEffet: "desc" }, { id: "desc" }],
          take: 1,
          select: { dateEffet: true },
        },
        affectations: {
          select: {
            section: {
              select: { id: true, libelle: true, division: { select: { id: true, libelle: true } } },
            },
          },
        },
        conges: {
          orderBy: [{ dateDebut: "desc" }, { id: "desc" }],
          take: 10,
          select: {
            id: true,
            type: true,
            dateDebut: true,
            dateFin: true,
            dureeJours: true,
            referenceDecision: true,
          },
        },
        documents: {
          orderBy: { document: { dateAjout: "desc" } },
          take: 10,
          select: {
            document: {
              select: {
                id: true,
                titre: true,
                dateDocument: true,
                typeDoc: { select: { libelle: true } },
              },
            },
          },
        },
      },
    }),
    prisma.grilleAvancement.findUnique({
      where: { id: 1 },
      select: { dureeEchelonMois: true, dureeClasseMois: true },
    }),
    prisma.politiqueConge.findUnique({
      where: { id: 1 },
      select: { joursAnnuels: true, reportIllimite: true },
    }),
  ]);
  if (!personne) {
    res.json({ data: null });
    return;
  }
  const year = new Date().getUTCFullYear();
  const [leaveUsed, advancementDates] = await Promise.all([
    prisma.conge.aggregate({
      where: {
        personneId: personne.id,
        type: "ANNUEL",
        dateDebut: { lt: new Date(Date.UTC(year + 1, 0, 1)) },
      },
      _sum: { dureeJours: true },
    }),
    grid
      ? Promise.resolve(
          getAdvancementDates(personne, grid.dureeEchelonMois, grid.dureeClasseMois),
        )
      : Promise.resolve(null),
  ]);
  const leaveBalance = calculateAnnualLeaveBalance(
    personne.dateEntree,
    policy?.joursAnnuels ?? 30,
    leaveUsed._sum.dureeJours ?? 0,
    year,
    policy?.reportIllimite ?? true,
  );
  res.json({
    data: {
      agent: {
        ...personne,
        dateEntree: personne.dateEntree.toISOString().slice(0, 10),
      },
      prochainesEcheances: advancementDates
        ? {
            echelon: advancementDates.echelon.toISOString().slice(0, 10),
            classe: advancementDates.classe?.toISOString().slice(0, 10) ?? null,
          }
        : null,
      soldeCongeAnnuel: leaveBalance,
    },
  });
}

export async function getTeamDashboard(_req: Request, res: Response) {
  const user = getAuthenticatedUser(res);
  const [grid, policy] = await Promise.all([
    prisma.grilleAvancement.findUnique({
      where: { id: 1 },
      select: { dureeEchelonMois: true, dureeClasseMois: true },
    }),
    prisma.politiqueConge.findUnique({
      where: { id: 1 },
      select: { joursAnnuels: true, reportIllimite: true },
    }),
  ]);
  const agents = await prisma.personnes.findMany({
    where: {
      AND: [agentReadWhere(user), { id: { not: user.personneId } }],
      estArchive: false,
    },
    select: {
      ...careerPlanSelect,
      affectations: {
        select: {
          section: { select: { id: true, libelle: true, division: { select: { id: true, libelle: true } } } },
        },
      },
      conges: {
        where: { dateFin: { gte: new Date() } },
        orderBy: { dateDebut: "asc" },
        take: 5,
        select: { id: true, type: true, dateDebut: true, dateFin: true, dureeJours: true },
      },
    },
    orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
  });
  const currentYear = new Date().getUTCFullYear();
  const usage = await prisma.conge.groupBy({
    by: ["personneId"],
    where: {
      personneId: { in: agents.map((agent) => agent.id) },
      type: "ANNUEL",
      dateDebut: { lt: new Date(Date.UTC(currentYear + 1, 0, 1)) },
    },
    _sum: { dureeJours: true },
  });
  const usedByAgent = new Map(usage.map(({ personneId, _sum }) => [personneId, _sum.dureeJours ?? 0]));
  const allowance = policy?.joursAnnuels ?? 30;
  res.json({
    data: agents.map((agent) => {
      const used = usedByAgent.get(agent.id) ?? 0;
      const leaveBalance = calculateAnnualLeaveBalance(
        agent.dateEntree,
        allowance,
        used,
        currentYear,
        policy?.reportIllimite ?? true,
      );
      const nextDates = grid
        ? getAdvancementDates(agent, grid.dureeEchelonMois, grid.dureeClasseMois)
        : null;
      return {
        id: agent.id,
        nom: agent.nom,
        prenoms: agent.prenoms,
        matricule: agent.matricule,
        fonction: agent.fonction,
        typeAgent: agent.typeAgent,
        etatCarriere: agent.etatCarriere,
        categorie: agent.categorie,
        classe: agent.classe,
        echelon: agent.echelon,
        affectations: agent.affectations,
        congesAvenir: agent.conges.map((conge) => ({
          ...conge,
          dateDebut: conge.dateDebut.toISOString().slice(0, 10),
          dateFin: conge.dateFin.toISOString().slice(0, 10),
        })),
        soldeCongeAnnuel: leaveBalance,
        prochainesEcheances: nextDates
          ? {
              echelon: nextDates.echelon.toISOString().slice(0, 10),
              classe: nextDates.classe?.toISOString().slice(0, 10) ?? null,
            }
          : null,
      };
    }),
  });
}
