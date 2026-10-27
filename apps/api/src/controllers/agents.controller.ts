import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { Role, type Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import type { AuthenticatedUser } from "../middlewares/authenticate.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { hasEffectivePermission } from "../middlewares/authorize.js";
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
  dureeContratMois: z.number().int().min(1).max(1200).nullable().optional(),
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

// La division est obligatoire : soit renseignée directement, soit déduite d'une section.
const createAgentSchema = z
  .object({
    ...agentFields,
    email: z.email().trim().toLowerCase().max(200),
    sectionId: z.number().int().positive().optional(),
    divisionId: z.number().int().positive().optional(),
    role: z.enum(Role).optional(),
  })
  .refine((data) => data.sectionId !== undefined || data.divisionId !== undefined, {
    message: "Une division ou une section doit être renseignée.",
    path: ["sectionId"],
  });
const updateAgentSchema = z
  .object({
    ...agentFields,
    email: z.email().trim().toLowerCase().max(200).optional(),
    sectionId: z.number().int().positive().optional(),
    divisionId: z.number().int().positive().optional(),
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

interface AgentPlacement {
  divisionId: number;
  divisionLibelle: string;
  sectionId: number | null;
  sectionLibelle: string | null;
  chefId: number | null;
}

async function resolveAgentPlacement(
  tx: Prisma.TransactionClient,
  input: { sectionId?: number; divisionId?: number },
  user: AuthenticatedUser,
  restrictToOwnScope: boolean,
): Promise<AgentPlacement> {
  const isSectionChief = user.role === "CHEF_SECTION";

  if (input.sectionId !== undefined) {
    const section = await tx.section.findUnique({
      where: { id: input.sectionId },
      select: {
        id: true,
        libelle: true,
        chefId: true,
        divisionId: true,
        division: { select: { id: true, libelle: true, chefId: true } },
      },
    });
    if (!section) {
      throw new AppError("Section introuvable.", 404, "SECTION_NOT_FOUND");
    }
    if (
      input.divisionId !== undefined &&
      input.divisionId !== section.divisionId
    ) {
      throw new AppError(
        "La section choisie n’appartient pas à la division indiquée.",
        400,
        "SECTION_DIVISION_MISMATCH",
      );
    }
    if (restrictToOwnScope) {
      if (isSectionChief) {
        if (section.chefId !== user.personneId) {
          throw new AppError(
            "Vous ne pouvez créer un agent que dans votre section.",
            403,
            "SECTION_SCOPE_FORBIDDEN",
          );
        }
      } else if (section.division.chefId !== user.personneId) {
        throw new AppError(
          "Vous ne pouvez créer un agent que dans votre division.",
          403,
          "DIVISION_SCOPE_FORBIDDEN",
        );
      }
    }
    return {
      divisionId: section.divisionId,
      divisionLibelle: section.division.libelle,
      sectionId: section.id,
      sectionLibelle: section.libelle,
      chefId: section.chefId ?? section.division.chefId ?? null,
    };
  }

  if (input.divisionId !== undefined) {
    const division = await tx.division.findUnique({
      where: { id: input.divisionId },
      select: { id: true, libelle: true, chefId: true },
    });
    if (!division) {
      throw new AppError("Division introuvable.", 404, "DIVISION_NOT_FOUND");
    }
    if (restrictToOwnScope) {
      if (isSectionChief) {
        throw new AppError(
          "Vous ne pouvez créer un agent que dans votre section.",
          403,
          "SECTION_SCOPE_FORBIDDEN",
        );
      }
      if (division.chefId !== user.personneId) {
        throw new AppError(
          "Vous ne pouvez créer un agent que dans votre division.",
          403,
          "DIVISION_SCOPE_FORBIDDEN",
        );
      }
    }
    return {
      divisionId: division.id,
      divisionLibelle: division.libelle,
      sectionId: null,
      sectionLibelle: null,
      chefId: division.chefId ?? null,
    };
  }

  throw new AppError(
    "Une division ou une section doit être renseignée.",
    400,
    "AGENT_PLACEMENT_REQUIRED",
  );
}

function describePlacement(placement: AgentPlacement): string {
  return placement.sectionLibelle
    ? `la section ${placement.sectionLibelle} (division ${placement.divisionLibelle})`
    : `la division ${placement.divisionLibelle}`;
}

async function syncAccountEmail(
  tx: Prisma.TransactionClient,
  personneId: number,
  email: string,
) {
  const account = await tx.utilisateur.findUnique({
    where: { personneId },
    select: { id: true, email: true },
  });
  if (!account || account.email === email) return;

  const emailOwner = await tx.utilisateur.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailOwner && emailOwner.id !== account.id) {
    throw new AppError(
      "Cette adresse e-mail est déjà utilisée par un compte.",
      409,
      "EMAIL_ALREADY_USED",
    );
  }
  await tx.utilisateur.update({
    where: { id: account.id },
    data: { email },
  });
}

function generateTemporaryPassword(): string {
  return randomBytes(18).toString("base64url");
}

function handleAgentWriteError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    const target =
      "meta" in error &&
      typeof error.meta === "object" &&
      error.meta !== null &&
      "target" in error.meta
        ? String(error.meta.target)
        : "";
    if (target.includes("email")) {
      throw new AppError(
        "Cette adresse e-mail est déjà utilisée par un compte.",
        409,
        "EMAIL_ALREADY_USED",
      );
    }
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
  const { sectionId, divisionId, role: requestedRole, ...data } =
    createAgentSchema.parse(req.body);

  const canWriteAll = hasEffectivePermission(user, "agents.write");
  const canCreateOwnDivision = hasEffectivePermission(
    user,
    "agents.create.division",
  );
  if (!canWriteAll && !canCreateOwnDivision) {
    throw new AppError(
      "Vous n’êtes pas autorisé à créer un agent.",
      403,
      "FORBIDDEN",
    );
  }

  // Un créateur disposant de agents.write choisit le rôle ; un chef de
  // division ou de section délégué crée uniquement des comptes Agent.
  const accountRole: Role = canWriteAll ? requestedRole ?? Role.AGENT : Role.AGENT;

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await argon2.hash(temporaryPassword, {
    type: argon2.argon2id,
  });

  try {
    const agent = await prisma.$transaction(async (tx) => {
      const placement = await resolveAgentPlacement(
        tx,
        { sectionId, divisionId },
        user,
        !canWriteAll,
      );

      const existingAccount = await tx.utilisateur.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      if (existingAccount) {
        throw new AppError(
          "Cette adresse e-mail est déjà utilisée par un compte.",
          409,
          "EMAIL_ALREADY_USED",
        );
      }

      const personne = await tx.personnes.create({
        data: {
          ...data,
          chefId: placement.chefId,
          email: data.email,
          nationalite: data.nationalite || null,
          situationMatrimoniale: data.situationMatrimoniale || null,
          formation: data.formation || null,
          service: placement.divisionLibelle,
        },
        include: agentInclude,
      });

      await tx.affectation.deleteMany({ where: { personneId: personne.id } });
      if (placement.sectionId !== null) {
        await tx.affectation.create({
          data: { personneId: personne.id, sectionId: placement.sectionId },
        });
      }

      const account = await tx.utilisateur.create({
        data: {
          email: data.email,
          personneId: personne.id,
          role: accountRole,
          passwordHash,
          mustChangePassword: true,
        },
        select: { id: true, email: true },
      });

      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "creation_agent",
          cible: String(personne.id),
          details: `Création de l'agent ${personne.matricule} ${personne.nom} ${personne.prenoms}, rattaché à ${describePlacement(placement)}${canWriteAll ? "" : " via une permission déléguée"}.`,
        },
      });

      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "creation_compte",
          cible: String(account.id),
          details: `Création automatique du compte ${account.email} (rôle ${accountRole}) pour l'agent ${personne.matricule}. Changement de mot de passe exigé à la première connexion.`,
        },
      });

      return personne;
    });
    res.status(201).json({ data: serializeAgent(agent), temporaryPassword });
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
  const { sectionId, divisionId, ...data } = updateAgentSchema.parse(req.body);
  const hasPlacement = sectionId !== undefined || divisionId !== undefined;
  try {
    const agent = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.PersonnesUncheckedUpdateInput = { ...data };

      if (hasPlacement) {
        const placement = await resolveAgentPlacement(
          tx,
          { sectionId, divisionId },
          user,
          false,
        );
        updateData.chefId = placement.chefId;
        updateData.service = placement.divisionLibelle;

        const personne = await tx.personnes.update({
          where: { id },
          data: updateData,
          include: agentInclude,
        });

        if (data.email !== undefined) {
          await syncAccountEmail(tx, personne.id, data.email);
        }

        await tx.affectation.deleteMany({ where: { personneId: personne.id } });
        if (placement.sectionId !== null) {
          await tx.affectation.create({
            data: { personneId: personne.id, sectionId: placement.sectionId },
          });
        }

        await tx.journalAudit.create({
          data: {
            auteurId: user.id,
            identifiant: user.email,
            action: "mise_a_jour_agent_affectation",
            cible: String(personne.id),
            details: `Changement d'affectation vers ${describePlacement(placement)}.`,
          },
        });

        if (Object.keys(data).length > 0) {
          await tx.journalAudit.create({
            data: {
              auteurId: user.id,
              identifiant: user.email,
              action: "modification_agent",
              cible: String(personne.id),
              details: `Modification de l'agent ${personne.matricule}. Champs modifiés : ${Object.keys(data).join(", ")}.`,
            },
          });
        }

        return personne;
      }

      const personne = await tx.personnes.update({
        where: { id },
        data: updateData,
        include: agentInclude,
      });

      if (data.email !== undefined) {
        await syncAccountEmail(tx, personne.id, data.email);
      }

      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "modification_agent",
          cible: String(personne.id),
          details: `Modification de l'agent ${personne.matricule}. Champs modifiés : ${Object.keys(data).join(", ")}.`,
        },
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
