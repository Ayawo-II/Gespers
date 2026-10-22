import {
  ModeModif,
  NatureModif,
  type Categorie,
  type Classe,
} from "@prisma/client";
import { prisma } from "../config/prisma.js";

const AUTOMATIC_JOB_LOCK_ID = 20261021;
const SYSTEM_IDENTIFIER = "systeme";

export interface ManualAdvancementInput {
  nature: NatureModif;
  dateEffet: Date;
  categorie: Categorie | null;
  classe: Classe | null;
  echelon: number | null;
  fonction?: string;
  justification: string;
  pieceJustificativeId?: number | null;
  modificateurId: number;
  modificateurEmail: string;
}

function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, month + 1, 0),
  ).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTargetMonth)));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function careerDetails(
  from: { categorie: string; classe: string; echelon: number },
  to: { categorie: string; classe: string; echelon: number },
): string {
  return `${from.categorie}/${from.classe}/${from.echelon} → ${to.categorie}/${to.classe}/${to.echelon}`;
}

export async function listAdvancements(personneId: number) {
  const personne = await prisma.personnes.findUnique({
    where: { id: personneId },
    select: { id: true },
  });
  if (!personne) return null;

  return prisma.mods.findMany({
    where: { personneId },
    orderBy: [{ dateEffet: "desc" }, { id: "desc" }],
    include: {
      modificateur: { select: { id: true, email: true, role: true } },
      pieceJustificative: { select: { id: true, titre: true, lien: true } },
    },
  });
}

export async function createManualAdvancement(
  personneId: number,
  input: ManualAdvancementInput,
) {
  return prisma.$transaction(async (tx) => {
    const personne = await tx.personnes.findUnique({ where: { id: personneId } });
    if (!personne) {
      return { kind: "not-found" as const };
    }
    if (
      personne.categorie === null ||
      personne.classe === null ||
      personne.echelon === null
    ) {
      return { kind: "career-not-initialized" as const };
    }

    const current = {
      categorie: personne.categorie,
      classe: personne.classe,
      echelon: personne.echelon,
    };
    const next = {
      categorie: input.categorie ?? personne.categorie,
      classe: input.classe ?? personne.classe,
      echelon: input.echelon ?? personne.echelon,
    };
    const nextFonction = input.fonction ?? personne.fonction;
    if (input.pieceJustificativeId) {
      const document = await tx.documents.findUnique({
        where: { id: input.pieceJustificativeId },
        select: { id: true },
      });
      if (!document) {
        return { kind: "justificative-document-not-found" as const };
      }
    }

    if (
      current.categorie === next.categorie &&
      current.classe === next.classe &&
      current.echelon === next.echelon &&
      personne.fonction === nextFonction
    ) {
      return { kind: "no-change" as const };
    }

    const mod = await tx.mods.create({
      data: {
        ancCategorie: current.categorie,
        ancClasse: current.classe,
        ancEchelon: current.echelon,
        ancFonction: personne.fonction,
        nvCategorie: next.categorie,
        nvClasse: next.classe,
        nvEchelon: next.echelon,
        nvFonction: nextFonction,
        dateEffet: input.dateEffet,
        nature: input.nature,
        mode: ModeModif.MANUEL,
        justification: input.justification,
        personneId,
        pieceJustificativeId: input.pieceJustificativeId,
        modificateurId: input.modificateurId,
      },
    });

    await tx.personnes.update({
      where: { id: personneId },
      data: {
        categorie: next.categorie,
        classe: next.classe,
        echelon: next.echelon,
        fonction: nextFonction,
        ...(input.nature === NatureModif.ECHELON
          ? { dateDernierAvancement: input.dateEffet }
          : {}),
      },
    });

    await tx.journalAudit.create({
      data: {
        auteurId: input.modificateurId,
        identifiant: input.modificateurEmail,
        action: "avancement_manuel",
        cible: String(personneId),
        details: careerDetails(current, next),
        justification: input.justification,
      },
    });

    return { kind: "created" as const, mod };
  });
}

export async function runAutomaticEchelonAdvancements(now = new Date()) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${AUTOMATIC_JOB_LOCK_ID})`;

      const grid = await tx.grilleAvancement.findUnique({ where: { id: 1 } });
      if (!grid) {
        throw new Error("La grille d’avancement initiale est introuvable.");
      }

      const candidates = await tx.personnes.findMany({
        where: {
          estArchive: false,
          typeAgent: "FONCTIONNAIRE",
          etatCarriere: "TITULAIRE",
          categorie: { not: null },
          classe: { not: null },
          echelon: { not: null },
        },
        select: {
          id: true,
          categorie: true,
          classe: true,
          echelon: true,
          fonction: true,
          dateEntree: true,
          dateDernierAvancement: true,
        },
      });

      let processed = 0;
      for (const personne of candidates) {
        if (
          personne.categorie === null ||
          personne.classe === null ||
          personne.echelon === null
        ) {
          continue;
        }
        const anchor = personne.dateDernierAvancement ?? personne.dateEntree;
        const dateEffet = addMonths(anchor, grid.dureeEchelonMois);
        if (dateEffet > today) continue;

        const currentEchelonIndex = grid.echelons.indexOf(
          String(personne.echelon),
        );
        if (
          currentEchelonIndex < 0 ||
          currentEchelonIndex >= grid.echelons.length - 1
        ) {
          continue;
        }
        const nextEchelon = Number(grid.echelons[currentEchelonIndex + 1]);
        if (!Number.isInteger(nextEchelon) || nextEchelon < 1) {
          throw new Error(
            `Échelon invalide dans la grille: ${grid.echelons[currentEchelonIndex + 1]}`,
          );
        }

        const current = {
          categorie: personne.categorie,
          classe: personne.classe,
          echelon: personne.echelon,
        };
        const next = { ...current, echelon: nextEchelon };
        await tx.mods.create({
          data: {
            ancCategorie: current.categorie,
            ancClasse: current.classe,
            ancEchelon: current.echelon,
            ancFonction: personne.fonction,
            nvCategorie: next.categorie,
            nvClasse: next.classe,
            nvEchelon: next.echelon,
            nvFonction: personne.fonction,
            dateEffet,
            nature: NatureModif.ECHELON,
            mode: ModeModif.AUTOMATIQUE,
            justification: `Avancement automatique après ${grid.dureeEchelonMois} mois.`,
            personneId: personne.id,
            modificateurId: null,
          },
        });
        await tx.personnes.update({
          where: { id: personne.id },
          data: {
            echelon: next.echelon,
            dateDernierAvancement: dateEffet,
          },
        });
        await tx.journalAudit.create({
          data: {
            identifiant: SYSTEM_IDENTIFIER,
            action: "avancement_automatique",
            cible: String(personne.id),
            details: careerDetails(current, next),
            justification: `Éligibilité atteinte le ${formatDate(dateEffet)}.`,
          },
        });
        processed += 1;
      }

      return { processed };
    },
    { timeout: 120_000 },
  );
}
