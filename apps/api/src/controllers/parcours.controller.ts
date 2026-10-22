import { EtatCarriere, ResultatExamen } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";
import { agentReadWhere } from "../services/agent-access.js";

const agentIdSchema = z.coerce.number().int().positive();
const dateOnlySchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const titularisationSchema = z.object({
  dateExamen: dateOnlySchema,
  resultat: z.enum(ResultatExamen),
  dateEffet: dateOnlySchema,
  referenceDecision: z.string().trim().min(1).max(150),
});

const departSchema = z.object({
  dateDepart: dateOnlySchema,
  motifDepart: z.enum(["RETRAITE", "DEMISSION", "REVOCATION", "DECES", "AUTRE"]),
  justification: z.string().trim().max(2000).optional(),
});

function parseAgentId(value: string | string[] | undefined): number {
  const result = agentIdSchema.safeParse(
    typeof value === "string" ? value : undefined,
  );
  if (!result.success) {
    throw new AppError("Identifiant d’agent invalide.", 400, "INVALID_AGENT_ID");
  }
  return result.data;
}

function dateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getTitularisation(req: Request, res: Response) {
  const personneId = parseAgentId(req.params.id);
  const user = getAuthenticatedUser(res);
  const personne = await prisma.personnes.findFirst({
    where: { id: personneId, ...agentReadWhere(user) },
    select: { id: true },
  });
  if (!personne) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }
  const titularisation = await prisma.titularisation.findUnique({
    where: { personneId },
  });
  if (!titularisation) {
    res.json({ data: null });
    return;
  }
  res.json({
    data: {
      ...titularisation,
      dateExamen: dateString(titularisation.dateExamen),
      dateEffet: dateString(titularisation.dateEffet),
    },
  });
}

export async function upsertTitularisation(req: Request, res: Response) {
  const personneId = parseAgentId(req.params.id);
  const data = titularisationSchema.parse(req.body);
  const user = getAuthenticatedUser(res);

  const result = await prisma.$transaction(async (tx) => {
    const personne = await tx.personnes.findUnique({
      where: { id: personneId },
      select: { id: true, etatCarriere: true },
    });
    if (!personne) return null;

    const titularisation = await tx.titularisation.upsert({
      where: { personneId },
      create: { ...data, personneId },
      update: data,
    });

    if (data.resultat === ResultatExamen.ADMIS) {
      if (personne.etatCarriere === EtatCarriere.SORTI) {
        throw new AppError(
          "Un agent sorti ne peut pas être titularisé.",
          409,
          "CAREER_ALREADY_CLOSED",
        );
      }
      await tx.personnes.update({
        where: { id: personneId },
        data: {
          etatCarriere: EtatCarriere.TITULAIRE,
        },
      });
      if (personne.etatCarriere !== EtatCarriere.TITULAIRE) {
        await tx.historiqueCarriere.create({
          data: {
            personneId,
            etatAvant: personne.etatCarriere,
            etatApres: EtatCarriere.TITULAIRE,
            dateEffet: data.dateEffet,
            motif: `Titularisation après examen admis — décision ${data.referenceDecision}.`,
            auteurId: user.id,
          },
        });
      }
    }

    await tx.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "titularisation",
        cible: String(personneId),
        details: `Examen ${data.resultat}, décision ${data.referenceDecision}, effet ${dateString(data.dateEffet)}.`,
      },
    });

    return titularisation;
  });

  if (!result) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }
  res.json({
    data: {
      ...result,
      dateExamen: dateString(result.dateExamen),
      dateEffet: dateString(result.dateEffet),
    },
  });
}

export async function closeCareer(req: Request, res: Response) {
  const personneId = parseAgentId(req.params.id);
  const data = departSchema.parse(req.body);
  const user = getAuthenticatedUser(res);

  const personne = await prisma.$transaction(async (tx) => {
    const existing = await tx.personnes.findUnique({
      where: { id: personneId },
      select: { id: true, etatCarriere: true },
    });
    if (!existing) return null;
    if (existing.etatCarriere === EtatCarriere.SORTI) {
      throw new AppError(
        "Le parcours de cet agent est déjà clôturé.",
        409,
        "CAREER_ALREADY_CLOSED",
      );
    }

    const updated = await tx.personnes.update({
      where: { id: personneId },
      data: {
        etatCarriere: EtatCarriere.SORTI,
        dateDepart: data.dateDepart,
        motifDepart: data.motifDepart,
      },
    });
    await tx.historiqueCarriere.create({
      data: {
        personneId,
        etatAvant: existing.etatCarriere,
        etatApres: EtatCarriere.SORTI,
        dateEffet: data.dateDepart,
        motif: data.motifDepart,
        auteurId: user.id,
      },
    });
    await tx.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "cloture_parcours",
        cible: String(personneId),
        details: `Départ ${data.motifDepart} le ${dateString(data.dateDepart)}.`,
        justification: data.justification,
      },
    });
    return updated;
  });

  if (!personne) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }
  res.json({
    data: {
      id: personne.id,
      etatCarriere: personne.etatCarriere,
      dateDepart: personne.dateDepart ? dateString(personne.dateDepart) : null,
      motifDepart: personne.motifDepart,
    },
  });
}
