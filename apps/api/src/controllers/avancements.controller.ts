import { NatureModif } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";
import { agentReadWhere } from "../services/agent-access.js";
import {
  careerPlanSelect,
  getAdvancementDates,
} from "../services/avancements-planning.js";
import {
  createManualAdvancement,
  listAdvancements,
} from "../services/avancements.service.js";

const idSchema = z.coerce.number().int().positive();
const dateOnlySchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const manualAdvancementSchema = z
  .object({
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
    pieceJustificativeId: z.number().int().positive().optional(),
  })
  .superRefine((data, context) => {
    const correctField =
      data.nature === "ECHELON"
        ? data.echelon !== undefined &&
          data.classe === undefined &&
          data.categorie === undefined
        : data.nature === "CLASSE"
          ? data.classe !== undefined &&
            data.echelon === undefined &&
            data.categorie === undefined
          : data.categorie !== undefined &&
            data.classe === undefined &&
            data.echelon === undefined;
    if (!correctField) {
      context.addIssue({
        code: "custom",
        path: ["nature"],
        message:
          "Le champ de carrière fourni doit correspondre à la nature de l’avancement.",
      });
    }
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
  const user = getAuthenticatedUser(res);
  const agent = await prisma.personnes.findFirst({
    where: { id: personneId, ...agentReadWhere(user) },
    select: { id: true },
  });
  if (!agent) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }

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

export async function listEligibleAdvancements(req: Request, res: Response) {
  const horizonDays = z.coerce
    .number()
    .int()
    .min(0)
    .max(365)
    .default(90)
    .parse(req.query.jours);
  const user = getAuthenticatedUser(res);
  const [grid, agents] = await Promise.all([
    prisma.grilleAvancement.findUnique({ where: { id: 1 } }),
    prisma.personnes.findMany({
      where: {
        ...agentReadWhere(user),
        estArchive: false,
        typeAgent: "FONCTIONNAIRE",
        etatCarriere: "TITULAIRE",
        categorie: { not: null },
        classe: { not: null },
        echelon: { not: null },
      },
      select: careerPlanSelect,
      orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
    }),
  ]);
  if (!grid) {
    throw new AppError(
      "La grille d’avancement n’est pas initialisée.",
      404,
      "GRID_NOT_INITIALIZED",
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + horizonDays);
  const candidates = agents.flatMap((agent) => {
    const dates = getAdvancementDates(
      agent,
      grid.dureeEchelonMois,
      grid.dureeClasseMois,
    );
    const echelonIndex = grid.echelons.indexOf(String(agent.echelon));
    const nextEchelon =
      echelonIndex >= 0 && echelonIndex < grid.echelons.length - 1
        ? Number(grid.echelons[echelonIndex + 1])
        : null;
    const classIndex = grid.classes.indexOf(agent.classe!);
    const nextClasse =
      classIndex >= 0 && classIndex < grid.classes.length - 1
        ? grid.classes[classIndex + 1]
        : null;
    const echelonEligible =
      dates.echelon <= end &&
      nextEchelon !== null &&
      Number.isInteger(nextEchelon);
    const classeEligible =
      dates.classe !== null && dates.classe <= end && nextClasse !== null;
    if (!echelonEligible && !classeEligible) return [];
    return [
      {
        agent: {
          id: agent.id,
          nom: agent.nom,
          prenoms: agent.prenoms,
          matricule: agent.matricule,
          fonction: agent.fonction,
          categorie: agent.categorie,
          classe: agent.classe,
          echelon: agent.echelon,
        },
        echelon: echelonEligible
          ? {
              dateEligibilite: dates.echelon.toISOString().slice(0, 10),
              prochainEchelon: nextEchelon,
              enRetard: dates.echelon < today,
            }
          : null,
        classe: classeEligible
          ? {
              dateEligibilite: dates.classe!.toISOString().slice(0, 10),
              prochaineClasse: nextClasse,
              enRetard: dates.classe! < today,
              validationManuelleRequise: true,
            }
          : null,
      },
    ];
  });

  res.json({
    data: candidates,
    meta: { jours: horizonDays, total: candidates.length },
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
    pieceJustificativeId: input.pieceJustificativeId ?? null,
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
  if (result.kind === "justificative-document-not-found") {
    throw new AppError(
      "La pièce justificative sélectionnée est introuvable.",
      404,
      "DOCUMENT_NOT_FOUND",
    );
  }

  res.status(201).json({
    data: {
      ...result.mod,
      dateEffet: result.mod.dateEffet.toISOString().slice(0, 10),
    },
  });
}
