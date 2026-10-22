import { TypeConge } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";

const idSchema = z.coerce.number().int().positive();
const dateOnlySchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const congeBodySchema = z
  .object({
    personneId: z.number().int().positive(),
    type: z.enum(TypeConge),
    dateDebut: dateOnlySchema,
    dateFin: dateOnlySchema,
    dureeJours: z.number().int().positive(),
    referenceDecision: z.string().trim().min(1).max(150),
    pieceJointe: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => data.dateFin >= data.dateDebut, {
    path: ["dateFin"],
    message: "La date de fin doit être postérieure ou égale à la date de début.",
  });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  personneId: z.coerce.number().int().positive().optional(),
});

function parseId(value: string | string[] | undefined): number {
  const result = idSchema.safeParse(typeof value === "string" ? value : undefined);
  if (!result.success) {
    throw new AppError("Identifiant de congé invalide.", 400, "INVALID_CONGE_ID");
  }
  return result.data;
}

function formatConge<T extends { dateDebut: Date; dateFin: Date; createdAt: Date }>(
  conge: T,
) {
  return {
    ...conge,
    dateDebut: conge.dateDebut.toISOString().slice(0, 10),
    dateFin: conge.dateFin.toISOString().slice(0, 10),
    createdAt: conge.createdAt.toISOString(),
  };
}

export async function listConges(req: Request, res: Response) {
  const { page, limit, personneId } = listQuerySchema.parse(req.query);
  const where = personneId === undefined ? {} : { personneId };
  const [conges, total] = await prisma.$transaction([
    prisma.conge.findMany({
      where,
      orderBy: [{ dateDebut: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        personne: {
          select: { id: true, nom: true, prenoms: true, matricule: true },
        },
        auteur: { select: { id: true, email: true } },
      },
    }),
    prisma.conge.count({ where }),
  ]);

  res.json({
    data: conges.map(formatConge),
    meta: { page, limit, total },
  });
}

export async function getConge(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const conge = await prisma.conge.findUnique({
    where: { id },
    include: {
      personne: {
        select: { id: true, nom: true, prenoms: true, matricule: true },
      },
      auteur: { select: { id: true, email: true } },
    },
  });
  if (!conge) {
    throw new AppError("Congé introuvable.", 404, "CONGE_NOT_FOUND");
  }
  res.json({ data: formatConge(conge) });
}

export async function createConge(req: Request, res: Response) {
  const data = congeBodySchema.parse(req.body);
  const user = getAuthenticatedUser(res);

  const conge = await prisma.$transaction(async (tx) => {
    const personne = await tx.personnes.findUnique({
      where: { id: data.personneId },
      select: { id: true },
    });
    if (!personne) {
      throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
    }
    const overlap = await tx.conge.findFirst({
      where: {
        personneId: data.personneId,
        dateDebut: { lte: data.dateFin },
        dateFin: { gte: data.dateDebut },
      },
      select: { id: true },
    });
    if (overlap) {
      throw new AppError(
        "Cette période chevauche un congé déjà enregistré pour l’agent.",
        409,
        "CONGE_OVERLAP",
      );
    }

    const created = await tx.conge.create({
      data: {
        ...data,
        auteurId: user.id,
      },
      include: {
        personne: {
          select: { id: true, nom: true, prenoms: true, matricule: true },
        },
        auteur: { select: { id: true, email: true } },
      },
    });
    await tx.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "enregistrement_conge",
        cible: String(data.personneId),
        details: `${data.type} ${data.dateDebut.toISOString().slice(0, 10)} → ${data.dateFin.toISOString().slice(0, 10)} (${data.referenceDecision})`,
      },
    });
    return created;
  });

  res.status(201).json({ data: formatConge(conge) });
}

export async function updateConge(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const data = congeBodySchema.parse(req.body);
  const user = getAuthenticatedUser(res);

  const conge = await prisma.$transaction(async (tx) => {
    const existing = await tx.conge.findUnique({
      where: { id },
      select: { id: true, personneId: true },
    });
    if (!existing) return null;

    const personne = await tx.personnes.findUnique({
      where: { id: data.personneId },
      select: { id: true },
    });
    if (!personne) {
      throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
    }

    const overlap = await tx.conge.findFirst({
      where: {
        personneId: data.personneId,
        id: { not: id },
        dateDebut: { lte: data.dateFin },
        dateFin: { gte: data.dateDebut },
      },
      select: { id: true },
    });
    if (overlap) {
      throw new AppError(
        "Cette période chevauche un congé déjà enregistré pour l’agent.",
        409,
        "CONGE_OVERLAP",
      );
    }

    const updated = await tx.conge.update({
      where: { id },
      data,
      include: {
        personne: {
          select: { id: true, nom: true, prenoms: true, matricule: true },
        },
        auteur: { select: { id: true, email: true } },
      },
    });
    await tx.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "modification_conge",
        cible: String(data.personneId),
        details: `${data.type} ${data.dateDebut.toISOString().slice(0, 10)} → ${data.dateFin.toISOString().slice(0, 10)} (${data.referenceDecision})`,
      },
    });
    return updated;
  });

  if (!conge) {
    throw new AppError("Congé introuvable.", 404, "CONGE_NOT_FOUND");
  }
  res.json({ data: formatConge(conge) });
}
