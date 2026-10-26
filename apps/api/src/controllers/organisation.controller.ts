import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

const organisationIdSchema = z.coerce.number().int().positive();

const divisionCreateSchema = z.object({
  libelle: z.string().trim().min(1).max(150),
  chefId: z.number().int().positive(),
});

const divisionUpdateSchema = z
  .object({
    libelle: z.string().trim().min(1).max(150).optional(),
    chefId: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ doit être fourni.",
  });

const sectionCreateSchema = z.object({
  libelle: z.string().trim().min(1).max(150),
  divisionId: z.number().int().positive(),
  chefId: z.number().int().positive(),
});

const sectionUpdateSchema = z
  .object({
    libelle: z.string().trim().min(1).max(150).optional(),
    divisionId: z.number().int().positive().optional(),
    chefId: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ doit être fourni.",
  });

const sectionListQuerySchema = z.object({
  divisionId: z.coerce.number().int().positive().optional(),
});

const chefSelect = {
  id: true,
  nom: true,
  prenoms: true,
  matricule: true,
};

function parseId(value: string | string[] | undefined, resource: string): number {
  const result = organisationIdSchema.safeParse(
    typeof value === "string" ? value : undefined,
  );
  if (!result.success) {
    throw new AppError(`Identifiant de ${resource} invalide.`, 400, "INVALID_ID");
  }
  return result.data;
}

function translateRelationError(
  error: unknown,
  resource: "division" | "section",
): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    const message =
      resource === "division"
        ? "Ce chef dirige déjà une autre division."
        : "Ce chef dirige déjà une autre section.";
    throw new AppError(
      message,
      409,
      "CHEF_ALREADY_ASSIGNED",
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2003"
  ) {
    throw new AppError(
      "La division ou le chef référencé n’existe pas.",
      404,
      "ORGANISATION_REFERENCE_NOT_FOUND",
    );
  }

  throw error;
}

async function ensureDivisionExists(id: number) {
  const division = await prisma.division.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!division) {
    throw new AppError("Division introuvable.", 404, "DIVISION_NOT_FOUND");
  }
}

export async function listDivisions(_req: Request, res: Response) {
  const divisions = await prisma.division.findMany({
    orderBy: [{ libelle: "asc" }, { id: "asc" }],
    include: {
      chef: { select: chefSelect },
      sections: {
        orderBy: [{ libelle: "asc" }, { id: "asc" }],
        include: { chef: { select: chefSelect } },
      },
    },
  });
  res.json({ data: divisions });
}

export async function getDivision(req: Request, res: Response) {
  const id = parseId(req.params.id, "division");
  const division = await prisma.division.findUnique({
    where: { id },
    include: {
      chef: { select: chefSelect },
      sections: {
        orderBy: [{ libelle: "asc" }, { id: "asc" }],
        include: { chef: { select: chefSelect } },
      },
    },
  });
  if (!division) {
    throw new AppError("Division introuvable.", 404, "DIVISION_NOT_FOUND");
  }
  res.json({ data: division });
}

export async function createDivision(req: Request, res: Response) {
  const data = divisionCreateSchema.parse(req.body);
  try {
    const division = await prisma.division.create({
      data,
      include: { chef: { select: chefSelect } },
    });
    res.status(201).json({ data: division });
  } catch (error) {
    translateRelationError(error, "division");
  }
}

export async function updateDivision(req: Request, res: Response) {
  const id = parseId(req.params.id, "division");
  const data = divisionUpdateSchema.parse(req.body);
  try {
    const division = await prisma.division.update({
      where: { id },
      data,
      include: { chef: { select: chefSelect } },
    });
    res.json({ data: division });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Division introuvable.", 404, "DIVISION_NOT_FOUND");
    }
    translateRelationError(error, "division");
  }
}

export async function listSections(req: Request, res: Response) {
  const { divisionId } = sectionListQuerySchema.parse(req.query);
  const sections = await prisma.section.findMany({
    where: divisionId === undefined ? undefined : { divisionId },
    orderBy: [{ libelle: "asc" }, { id: "asc" }],
    include: {
      division: { select: { id: true, libelle: true } },
      chef: { select: chefSelect },
    },
  });
  res.json({ data: sections });
}

export async function getSection(req: Request, res: Response) {
  const id = parseId(req.params.id, "section");
  const section = await prisma.section.findUnique({
    where: { id },
    include: {
      division: { select: { id: true, libelle: true } },
      chef: { select: chefSelect },
    },
  });
  if (!section) {
    throw new AppError("Section introuvable.", 404, "SECTION_NOT_FOUND");
  }
  res.json({ data: section });
}

export async function createSection(req: Request, res: Response) {
  const data = sectionCreateSchema.parse(req.body);
  await ensureDivisionExists(data.divisionId);
  try {
    const section = await prisma.section.create({
      data,
      include: {
        division: { select: { id: true, libelle: true } },
        chef: { select: chefSelect },
      },
    });
    res.status(201).json({ data: section });
  } catch (error) {
    translateRelationError(error, "section");
  }
}

export async function updateSection(req: Request, res: Response) {
  const id = parseId(req.params.id, "section");
  const data = sectionUpdateSchema.parse(req.body);
  if (data.divisionId !== undefined) {
    await ensureDivisionExists(data.divisionId);
  }
  try {
    const section = await prisma.section.update({
      where: { id },
      data,
      include: {
        division: { select: { id: true, libelle: true } },
        chef: { select: chefSelect },
      },
    });
    res.json({ data: section });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Section introuvable.", 404, "SECTION_NOT_FOUND");
    }
    translateRelationError(error, "section");
  }
}
