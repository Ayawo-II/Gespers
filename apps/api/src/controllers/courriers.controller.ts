import { TypeCourrier } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";

const idSchema = z.coerce.number().int().positive();
const dateOnlySchema = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));

const courrierBodySchema = z.object({
  reference: z.string().trim().min(1).max(150),
  type: z.enum(TypeCourrier),
  date: dateOnlySchema,
  objet: z.string().trim().min(1).max(500),
  expediteur: z.string().trim().min(1).max(200),
  destinataire: z.string().trim().min(1).max(200),
  personneId: z.number().int().positive().nullable().optional(),
  service: z.string().trim().max(150).nullable().optional(),
  resume: z.string().trim().max(5000).default(""),
  documentId: z.number().int().positive().nullable().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  type: z.enum(TypeCourrier).optional(),
});

function parseId(value: string | string[] | undefined): number {
  const result = idSchema.safeParse(typeof value === "string" ? value : undefined);
  if (!result.success) {
    throw new AppError("Identifiant de courrier invalide.", 400, "INVALID_COURRIER_ID");
  }
  return result.data;
}

function serializeCourrier<T extends { date: Date; createdAt: Date }>(courrier: T) {
  return {
    ...courrier,
    date: courrier.date.toISOString().slice(0, 10),
    createdAt: courrier.createdAt.toISOString(),
  };
}

function translateCourrierError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    throw new AppError("Cette référence de courrier est déjà utilisée.", 409, "DUPLICATE_COURRIER_REFERENCE");
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2003"
  ) {
    throw new AppError("L’agent ou le document lié est introuvable.", 404, "COURRIER_REFERENCE_NOT_FOUND");
  }
  throw error;
}

function buildWhere(query: z.infer<typeof listQuerySchema>) {
  return {
    ...(query.type ? { type: query.type } : {}),
    ...(query.q
      ? {
          OR: [
            { reference: { contains: query.q, mode: "insensitive" as const } },
            { objet: { contains: query.q, mode: "insensitive" as const } },
            { expediteur: { contains: query.q, mode: "insensitive" as const } },
            { destinataire: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

const courrierInclude = {
  personne: { select: { id: true, nom: true, prenoms: true, matricule: true } },
  document: { select: { id: true, titre: true, lien: true, nomFichier: true } },
  auteur: { select: { id: true, email: true } },
};

export async function listCourriers(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  const where = buildWhere(query);
  const [courriers, total] = await prisma.$transaction([
    prisma.courrier.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: courrierInclude,
    }),
    prisma.courrier.count({ where }),
  ]);
  res.json({
    data: courriers.map(serializeCourrier),
    meta: { page: query.page, limit: query.limit, total },
  });
}

export async function getCourrier(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const courrier = await prisma.courrier.findUnique({
    where: { id },
    include: courrierInclude,
  });
  if (!courrier) {
    throw new AppError("Courrier introuvable.", 404, "COURRIER_NOT_FOUND");
  }
  res.json({ data: serializeCourrier(courrier) });
}

export async function createCourrier(req: Request, res: Response) {
  const data = courrierBodySchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  try {
    const courrier = await prisma.$transaction(async (tx) => {
      const created = await tx.courrier.create({
        data: { ...data, auteurId: user.id },
        include: courrierInclude,
      });
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "creation_courrier",
          cible: String(created.id),
          details: `${created.reference} — ${created.objet}`,
        },
      });
      return created;
    });
    res.status(201).json({ data: serializeCourrier(courrier) });
  } catch (error) {
    translateCourrierError(error);
  }
}

export async function updateCourrier(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const data = courrierBodySchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  try {
    const courrier = await prisma.$transaction(async (tx) => {
      const updated = await tx.courrier.update({
        where: { id },
        data,
        include: courrierInclude,
      });
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "modification_courrier",
          cible: String(updated.id),
          details: `${updated.reference} — ${updated.objet}`,
        },
      });
      return updated;
    });
    res.json({ data: serializeCourrier(courrier) });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Courrier introuvable.", 404, "COURRIER_NOT_FOUND");
    }
    translateCourrierError(error);
  }
}
