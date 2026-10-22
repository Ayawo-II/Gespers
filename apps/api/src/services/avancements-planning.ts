import type { Prisma } from "@prisma/client";

type CareerPlanInput = {
  dateEntree: Date;
  dateDernierAvancement: Date | null;
  etatCarriere: string;
  echelon: number | null;
  classe: string | null;
  titularisation: { dateEffet: Date } | null;
  historique: { dateEffet: Date }[];
};

export function addMonths(date: Date, months: number): Date {
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

export function getAdvancementDates(
  agent: CareerPlanInput,
  dureeEchelonMois: number,
  dureeClasseMois: number,
) {
  const lastClassAdvancement = agent.historique[0]?.dateEffet;
  const classAnchor =
    lastClassAdvancement ?? agent.titularisation?.dateEffet ?? agent.dateEntree;
  return {
    echelon: addMonths(
      agent.dateDernierAvancement ?? agent.dateEntree,
      dureeEchelonMois,
    ),
    classe:
      agent.etatCarriere === "TITULAIRE" && agent.classe
        ? addMonths(classAnchor, dureeClasseMois)
        : null,
  };
}

export const careerPlanSelect = {
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
  titularisation: { select: { dateEffet: true } },
  historique: {
    where: { nature: "CLASSE" },
    orderBy: [{ dateEffet: "desc" }, { id: "desc" }],
    take: 1,
    select: { dateEffet: true },
  },
} satisfies Prisma.PersonnesSelect;
