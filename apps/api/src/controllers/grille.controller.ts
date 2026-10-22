import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";

const updateGridSchema = z.object({
  categories: z
    .array(z.enum(["D", "C", "B", "A3", "A2", "A1"]))
    .min(1)
    .refine((values) => new Set(values).size === values.length, {
      message: "Les catégories ne doivent pas être dupliquées.",
    }),
  classes: z
    .array(
      z.enum([
        "CLASSE_3",
        "CLASSE_2",
        "CLASSE_1",
        "CLASSE_PRINCIPALE",
        "EXCEPTIONNELLE",
      ]),
    )
    .min(1)
    .refine((values) => new Set(values).size === values.length, {
      message: "Les classes ne doivent pas être dupliquées.",
    }),
  echelons: z
    .array(z.string().regex(/^[1-9]\d*$/))
    .min(1)
    .refine((values) => new Set(values).size === values.length, {
      message: "Les échelons ne doivent pas être dupliqués.",
    }),
  dureeEchelonMois: z.number().int().min(1).max(1200),
  dureeClasseMois: z.number().int().min(1).max(1200),
});

export async function getGrille(_req: Request, res: Response) {
  const grille = await prisma.grilleAvancement.findUnique({
    where: { id: 1 },
  });
  if (!grille) {
    throw new AppError(
      "La grille d’avancement n’est pas initialisée.",
      404,
      "GRID_NOT_INITIALIZED",
    );
  }
  res.json({ data: grille });
}

export async function updateGrille(req: Request, res: Response) {
  const data = updateGridSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  const grille = await prisma.$transaction(async (tx) => {
    const updated = await tx.grilleAvancement.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
    await tx.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "parametrage_grille",
        cible: "grille",
        details: `Échelon ${data.dureeEchelonMois} mois / classe ${data.dureeClasseMois} mois`,
      },
    });
    return updated;
  });
  res.json({ data: grille });
}
