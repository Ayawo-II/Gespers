import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";
import { agentReadWhere } from "../services/agent-access.js";

const idSchema = z.coerce.number().int().positive();
const dateSchema = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));

function parseId(value: string | string[] | undefined, label: string): number {
  const parsed = idSchema.safeParse(typeof value === "string" ? value : undefined);
  if (!parsed.success) {
    throw new AppError(`Identifiant ${label} invalide.`, 400, "INVALID_ID");
  }
  return parsed.data;
}

export async function getCareerHistory(req: Request, res: Response) {
  const personneId = parseId(req.params.id, "agent");
  const user = getAuthenticatedUser(res);
  const wherePersonne = { id: personneId, ...agentReadWhere(user) };
  const person = await prisma.personnes.findFirst({
    where: wherePersonne,
    select: { id: true },
  });
  if (!person) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }

  const [careerStates, advancements, assignments] = await Promise.all([
    prisma.historiqueCarriere.findMany({
      where: { personneId },
      orderBy: [{ dateEffet: "desc" }, { id: "desc" }],
      include: { auteur: { select: { id: true, email: true } } },
    }),
    prisma.mods.findMany({
      where: { personneId },
      orderBy: [{ dateEffet: "desc" }, { id: "desc" }],
      include: {
        modificateur: { select: { id: true, email: true } },
        pieceJustificative: { select: { id: true, titre: true } },
      },
    }),
    prisma.historiqueAffectation.findMany({
      where: { personneId },
      orderBy: [{ dateDebut: "desc" }, { id: "desc" }],
      include: {
        section: { select: { id: true, libelle: true, division: { select: { id: true, libelle: true } } } },
        auteur: { select: { id: true, email: true } },
      },
    }),
  ]);

  res.json({
    data: {
      etatsCarriere: careerStates.map((item) => ({
        ...item,
        dateEffet: item.dateEffet.toISOString().slice(0, 10),
      })),
      avancements: advancements.map((item) => ({
        ...item,
        dateEffet: item.dateEffet.toISOString().slice(0, 10),
      })),
      affectations: assignments.map((item) => ({
        ...item,
        dateDebut: item.dateDebut.toISOString().slice(0, 10),
        dateFin: item.dateFin?.toISOString().slice(0, 10) ?? null,
      })),
    },
  });
}

const startAssignmentSchema = z.object({
  sectionId: z.number().int().positive(),
  dateDebut: dateSchema,
});

export async function startAssignment(req: Request, res: Response) {
  const personneId = parseId(req.params.id, "agent");
  const input = startAssignmentSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  const assignment = await prisma.$transaction(async (tx) => {
    const person = await tx.personnes.findUnique({
      where: { id: personneId },
      select: { id: true, estArchive: true },
    });
    if (!person) {
      throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
    }
    if (person.estArchive) {
      throw new AppError("Un agent archivé ne peut pas recevoir d’affectation.", 409, "AGENT_ARCHIVED");
    }
    const section = await tx.section.findUnique({
      where: { id: input.sectionId },
      select: { id: true },
    });
    if (!section) {
      throw new AppError("Section introuvable.", 404, "SECTION_NOT_FOUND");
    }
    const currentAssignment = await tx.affectation.findUnique({
      where: {
        personneId_sectionId: { personneId, sectionId: input.sectionId },
      },
    });
    if (currentAssignment) {
      throw new AppError("L’agent est déjà affecté à cette section.", 409, "ASSIGNMENT_ALREADY_EXISTS");
    }
    await tx.affectation.create({
      data: { personneId, sectionId: input.sectionId },
    });
    const history = await tx.historiqueAffectation.create({
      data: {
        personneId,
        sectionId: input.sectionId,
        dateDebut: input.dateDebut,
        auteurId: user.id,
      },
      include: {
        section: { select: { id: true, libelle: true, division: { select: { id: true, libelle: true } } } },
      },
    });
    await tx.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "affectation_agent",
        cible: String(personneId),
        details: `Affectation à la section ${history.section.libelle} dès le ${input.dateDebut.toISOString().slice(0, 10)}.`,
      },
    });
    return history;
  });
  res.status(201).json({
    data: {
      ...assignment,
      dateDebut: assignment.dateDebut.toISOString().slice(0, 10),
      dateFin: null,
    },
  });
}

const endAssignmentSchema = z.object({ dateFin: dateSchema });

export async function endAssignment(req: Request, res: Response) {
  const personneId = parseId(req.params.id, "agent");
  const sectionId = parseId(req.params.sectionId, "section");
  const { dateFin } = endAssignmentSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  const closed = await prisma.$transaction(async (tx) => {
    const history = await tx.historiqueAffectation.findFirst({
      where: { personneId, sectionId, dateFin: null },
      orderBy: [{ dateDebut: "desc" }, { id: "desc" }],
    });
    const assignment = await tx.affectation.findUnique({
      where: { personneId_sectionId: { personneId, sectionId } },
    });
    if (!history || !assignment) {
      throw new AppError("Affectation active introuvable.", 404, "ASSIGNMENT_NOT_FOUND");
    }
    if (dateFin < history.dateDebut) {
      throw new AppError("La fin d’affectation ne peut précéder son début.", 400, "INVALID_DATE_RANGE");
    }
    const updated = await tx.historiqueAffectation.update({
      where: { id: history.id },
      data: { dateFin },
      include: { section: { select: { libelle: true } } },
    });
    await tx.affectation.delete({
      where: { personneId_sectionId: { personneId, sectionId } },
    });
    await tx.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "fin_affectation_agent",
        cible: String(personneId),
        details: `Fin d’affectation à ${updated.section.libelle} le ${dateFin.toISOString().slice(0, 10)}.`,
      },
    });
    return updated;
  });
  res.json({
    data: {
      ...closed,
      dateDebut: closed.dateDebut.toISOString().slice(0, 10),
      dateFin: closed.dateFin?.toISOString().slice(0, 10) ?? null,
    },
  });
}
