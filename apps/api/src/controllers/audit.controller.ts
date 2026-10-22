import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  dateDebut: z.iso.date().optional(),
  dateFin: z.iso.date().optional(),
});

export async function listAuditEntries(req: Request, res: Response) {
  const query = querySchema.parse(req.query);
  const startDate = query.dateDebut
    ? new Date(`${query.dateDebut}T00:00:00.000Z`)
    : undefined;
  const endDate = query.dateFin
    ? new Date(`${query.dateFin}T23:59:59.999Z`)
    : undefined;

  if (startDate && endDate && startDate > endDate) {
    throw new AppError(
      "La date de début doit précéder la date de fin.",
      400,
      "INVALID_DATE_RANGE",
    );
  }

  const where = {
    ...(query.action ? { action: query.action } : {}),
    ...(startDate || endDate
      ? { date: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } }
      : {}),
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q, mode: "insensitive" as const } },
            { cible: { contains: query.q, mode: "insensitive" as const } },
            { details: { contains: query.q, mode: "insensitive" as const } },
            { identifiant: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [entries, total] = await prisma.$transaction([
    prisma.journalAudit.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        date: true,
        identifiant: true,
        action: true,
        cible: true,
        details: true,
        justification: true,
        auteur: { select: { id: true, email: true } },
      },
    }),
    prisma.journalAudit.count({ where }),
  ]);

  res.json({
    data: entries,
    meta: { page: query.page, limit: query.limit, total },
  });
}
