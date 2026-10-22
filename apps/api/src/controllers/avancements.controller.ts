import { NatureModif } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import {
  createManualAdvancement,
  listAdvancements,
} from "../services/avancements.service.js";

const idSchema = z.coerce.number().int().positive();
const dateOnlySchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const manualAdvancementSchema = z.object({
  nature: z.enum(NatureModif),
  dateEffet: dateOnlySchema,
  categorie: z.enum(["D", "C", "B", "A3", "A2", "A1"]).optional(),
  classe: z
    .enum([
      "CLASSE_3",
      "CLASSE_2",
      "CLASSE_1",
      "CLASSE_PRINCIPALE",
      "EXCEPTIONNELLE",
    ])
    .optional(),
  echelon: z.number().int().positive().optional(),
  fonction: z.string().trim().min(1).max(200).optional(),
  justification: z.string().trim().min(1).max(2000),
});

function parsePersonneId(value: string | string[] | undefined): number {
  const result = idSchema.safeParse(
    typeof value === "string" ? value : undefined,
  );
  if (!result.success) {
    throw new AppError("Identifiant d’agent invalide.", 400, "INVALID_AGENT_ID");
  }
  return result.data;
}

export async function listAgentAdvancements(req: Request, res: Response) {
  const personneId = parsePersonneId(req.params.id);
  const advancements = await listAdvancements(personneId);
  if (!advancements) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }
  res.json({
    data: advancements.map((mod) => ({
      ...mod,
      dateEffet: mod.dateEffet.toISOString().slice(0, 10),
    })),
  });
}

export async function createAgentAdvancement(req: Request, res: Response) {
  const personneId = parsePersonneId(req.params.id);
  const input = manualAdvancementSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  const result = await createManualAdvancement(personneId, {
    ...input,
    categorie: input.categorie ?? null,
    classe: input.classe ?? null,
    echelon: input.echelon ?? null,
    modificateurId: user.id,
    modificateurEmail: user.email,
  });

  if (result.kind === "not-found") {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }
  if (result.kind === "career-not-initialized") {
    throw new AppError(
      "La carrière de cet agent doit être initialisée avant un avancement.",
      409,
      "CAREER_NOT_INITIALIZED",
    );
  }
  if (result.kind === "no-change") {
    throw new AppError(
      "Les nouvelles valeurs sont identiques à la carrière actuelle.",
      400,
      "NO_CAREER_CHANGE",
    );
  }

  res.status(201).json({
    data: { ...result.mod, dateEffet: result.mod.dateEffet.toISOString().slice(0, 10) },
  });
}
