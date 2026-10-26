import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";
import { agentReadWhere } from "../services/agent-access.js";

const dateOnlySchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const agentFields = {
  nom: z.string().trim().min(1).max(150),
  prenoms: z.string().trim().min(1).max(200),
  dateNaissance: dateOnlySchema,
  lieuNaissance: z.string().trim().min(1).max(200),
  sexe: z.enum(["M", "F"]),
  nbreEnfant: z.number().int().min(0),
  nomPersonnePrevenir: z.string().trim().min(1).max(200),
  contactPersonnePrevenir: z.string().trim().min(1).max(50),
  telephone: z.string().trim().min(1).max(50),
  adresse: z.string().trim().min(1).max(300),
  diplome: z.string().trim().min(1).max(200),
  fonction: z.string().trim().min(1).max(200),
  matricule: z.string().trim().min(1).max(50),
  categorie: z.enum(["D", "C", "B", "A3", "A2", "A1"]).nullable().optional(),
  classe: z
    .enum([
      "CLASSE_3",
      "CLASSE_2",
      "CLASSE_1",
      "CLASSE_PRINCIPALE",
      "EXCEPTIONNELLE",
    ])
    .nullable()
    .optional(),
  echelon: z.number().int().min(0).nullable().optional(),
  indice: z.number().int().min(0).nullable().optional(),
  typeAgent: z.enum(["FONCTIONNAIRE", "CONTRACTUEL", "PIGISTE"]),
  etatCarriere: z.enum(["STAGIAIRE", "TITULAIRE", "SORTI"]),
  dateEntree: dateOnlySchema,
  dateDebutStage: dateOnlySchema.nullable().optional(),
  dateFinStagePrevue: dateOnlySchema.nullable().optional(),
  dateFinContrat: dateOnlySchema.nullable().optional(),
  dateDernierAvancement: dateOnlySchema.nullable().optional(),
  dateDepart: dateOnlySchema.nullable().optional(),
  motifDepart: z
    .enum(["RETRAITE", "DEMISSION", "REVOCATION", "DECES", "AUTRE"])
    .nullable()
    .optional(),
  estArchive: z.boolean().optional(),
  email: z.email().trim().max(200).nullable().optional(),
  nationalite: z.string().trim().max(100).nullable().optional(),
  situationMatrimoniale: z.string().trim().max(100).nullable().optional(),
  formation: z.string().trim().max(200).nullable().optional(),
  service: z.string().trim().max(200).nullable().optional(),
  membreAral: z.boolean().optional(),
  photo: z.string().trim().max(2_000_000).nullable().optional(),
  sectionId: z.number().int().positive(),
  chefId: z.number().int().positive().nullable().optional(),
};

const agentPhotoSchema = z.object({
  photo: z.string().trim().max(2_000_000).nullable(),
});

const createAgentSchema = z.object(agentFields);
const updateAgentSchema = z
  .object({
    ...agentFields,
    sectionId: z.number().int().positive().optional(),
  })
  .omit({
    fonction: true,
    categorie: true,
    classe: true,
    echelon: true,
    indice: true,
    dateEntree: true,
    dateDebutStage: true,
    dateFinStagePrevue: true,
    dateDernierAvancement: true,
    dateDepart: true,
    motifDepart: true,
    etatCarriere: true,
  })
  .strict()
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ doit être fourni.",
  });

const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  estArchive: z.enum(["true", "false"]).optional(),
});

const agentIdSchema = z.coerce.number().int().positive();
const agentInclude = {
  affectations: { select: { sectionId: true } },
  titularisation: {
    select: {
      dateExamen: true,
      resultat: true,
      dateEffet: true,
      referenceDecision: true,
    },
  },
} as const;

const dateFields = [
  "dateNaissance",
  "dateEntree",
  "dateDebutStage",
  "dateFinStagePrevue",
  "dateFinContrat",
  "dateDernierAvancement",
  "dateDepart",
] as const;

function serializeAgent<T extends Record<(typeof dateFields)[number], Date | null>>(agent: T) {
  return {
    ...agent,
    dateNaissance: formatDate(agent.dateNaissance),
    dateEntree: formatDate(agent.dateEntree),
    dateDebutStage: formatDate(agent.dateDebutStage),
    dateFinStagePrevue: formatDate(agent.dateFinStagePrevue),
    dateFinContrat: formatDate(agent.dateFinContrat),
    dateDernierAvancement: formatDate(agent.dateDernierAvancement),
    dateDepart: formatDate(agent.dateDepart),
  };
}

function formatDate(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null;
}

function parseId(value: string | string[] | undefined): number {
  const result = agentIdSchema.safeParse(
    typeof value === "string" ? value : undefined,
  );
  if (!result.success) {
    throw new AppError("Identifiant d’agent invalide.", 400, "INVALID_AGENT_ID");
  }
  return result.data;
}

function handleAgentWriteError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    throw new AppError("Ce matricule existe déjà.", 409, "DUPLICATE_MATRICULE");
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2003"
  ) {
    throw new AppError(
      "Le chef hiérarchique indiqué est introuvable.",
      404,
      "AGENT_REFERENCE_NOT_FOUND",
    );
  }

  throw error;
}

export async function listAgents(req: Request, res: Response) {
  const { page, limit, q, estArchive } = listAgentsQuerySchema.parse(req.query);
  const user = getAuthenticatedUser(res);
  const where = {
    AND: [agentReadWhere(user)],
    ...(estArchive === undefined ? {} : { estArchive: estArchive === "true" }),
    ...(q
      ? {
          OR: [
            { nom: { contains: q, mode: "insensitive" as const } },
            { prenoms: { contains: q, mode: "insensitive" as const } },
            { matricule: { contains: q, mode: "insensitive" as const } },
            { fonction: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [agents, total] = await prisma.$transaction([
    prisma.personnes.findMany({
      where,
      orderBy: [{ nom: "asc" }, { prenoms: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: agentInclude,
    }),
    prisma.personnes.count({ where }),
  ]);

  res.json({
    data: agents.map(serializeAgent),
    meta: { page, limit, total },
  });
}

export async function getAgent(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const user = getAuthenticatedUser(res);
  const agent = await prisma.personnes.findFirst({
    where: { id, ...agentReadWhere(user) },
    include: agentInclude,
  });
  if (!agent) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }

  res.json({ data: serializeAgent(agent) });
}

export async function createAgent(req: Request, res: Response) {
  const user = getAuthenticatedUser(res);
  const { sectionId, ...data } = createAgentSchema.parse(req.body);
  try {
    const agent = await prisma.$transaction(async (tx) => {
      const section = await tx.section.findUnique({
        where: { id: sectionId },
        select: { id: true, libelle: true, chefId: true },
      });
      if (!section) {
        throw new AppError("Section introuvable.", 404, "SECTION_NOT_FOUND");
      }

      const personne = await tx.personnes.create({
        data: {
          ...data,
          chefId: section.chefId ?? null,
          email: data.email || null,
          nationalite: data.nationalite || null,
          situationMatrimoniale: data.situationMatrimoniale || null,
          formation: data.formation || null,
          service: data.service || null,
        },
        include: agentInclude,
      });

      await tx.affectation.deleteMany({ where: { personneId: personne.id } });
      await tx.affectation.create({
        data: { personneId: personne.id, sectionId: section.id },
      });

      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "creation_agent",
          cible: String(personne.id),
          details: `Création de l'agent ${personne.matricule} ${personne.nom} ${personne.prenoms}. Affectation à la section ${section.libelle} (chef de section devient supérieur direct).`,
        },
      });

      return personne;
    });
    res.status(201).json({ data: serializeAgent(agent) });
  } catch (error) {
    handleAgentWriteError(error);
  }
}

export async function updateMyPhoto(req: Request, res: Response) {
  const { photo } = agentPhotoSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  try {
    const agent = await prisma.$transaction(async (tx) => {
      const updated = await tx.personnes.update({
        where: { id: user.personneId },
        data: { photo: photo && photo.length > 0 ? photo : null },
        select: { id: true, photo: true },
      });
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "modification_photo_agent",
          cible: String(user.personneId),
          details: updated.photo
            ? "Photo de profil mise à jour."
            : "Photo de profil supprimée.",
        },
      });
      return updated;
    });
    res.json({ data: agent });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
    }
    throw error;
  }
}

export async function updateAgentPhoto(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const { photo } = agentPhotoSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  try {
    const agent = await prisma.$transaction(async (tx) => {
      const updated = await tx.personnes.update({
        where: { id },
        data: { photo: photo && photo.length > 0 ? photo : null },
        select: { id: true, photo: true },
      });
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "modification_photo_agent",
          cible: String(id),
          details: updated.photo
            ? "Photo de profil mise à jour."
            : "Photo de profil supprimée.",
        },
      });
      return updated;
    });
    res.json({ data: agent });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
    }
    throw error;
  }
}

export async function updateAgent(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const user = getAuthenticatedUser(res);
  const { sectionId, ...data } = updateAgentSchema.parse(req.body);
  try {
    const agent = await prisma.$transaction(async (tx) => {
      if (sectionId !== undefined) {
        const section = await tx.section.findUnique({
          where: { id: sectionId },
          select: { id: true, libelle: true, chefId: true },
        });
        if (!section) {
          throw new AppError("Section introuvable.", 404, "SECTION_NOT_FOUND");
        }

        const personne = await tx.personnes.update({
          where: { id },
          data: {
            ...data,
            chefId: section.chefId ?? null,
          },
          include: agentInclude,
        });

        await tx.affectation.deleteMany({ where: { personneId: personne.id } });
        await tx.affectation.create({
          data: { personneId: personne.id, sectionId: section.id },
        });

        await tx.journalAudit.create({
          data: {
            auteurId: user.id,
            identifiant: user.email,
            action: "mise_a_jour_agent_affectation",
            cible: String(personne.id),
            details: `Changement d'affectation vers la section ${section.libelle} (chef de section devient supérieur direct).`,
          },
        });

        return personne;
      }

      const personne = await tx.personnes.update({
        where: { id },
        data,
        include: agentInclude,
      });
      return personne;
    });
    res.json({ data: serializeAgent(agent) });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
    }
    handleAgentWriteError(error);
  }
}
