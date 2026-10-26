import {
  ModeModif,
  NatureModif,
  type Categorie,
  type Classe,
} from "@prisma/client";
import { prisma } from "../config/prisma.js";

export interface ManualAdvancementInput {
  nature: NatureModif;
  dateEffet: Date;
  categorie: Categorie | null;
  classe: Classe | null;
  echelon: number | null;
  fonction?: string;
  justification: string;
  modificateurId: number;
  modificateurEmail: string;
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
        dateDernierAvancement: input.dateEffet,
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


