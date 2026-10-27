import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { Role } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import {
  isDelegablePermission,
  type Permission,
} from "../middlewares/authorize.js";
import { AppError } from "../middlewares/errorHandler.js";

const idSchema = z.coerce.number().int().positive();
const createAccountSchema = z.object({
  email: z.email().trim().toLowerCase(),
  personneId: z.number().int().positive(),
  role: z.enum(Role),
});
const changeRoleSchema = z.object({ role: z.enum(Role) });
const updatePermissionsSchema = z.object({
  permissions: z.array(z.string().trim().min(1).max(100)).max(20),
});
const disableSchema = z.object({
  isActive: z.boolean(),
  motifDesactivation: z.string().trim().min(1).max(1000).optional(),
});

const accountSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  dateDesactivation: true,
  motifDesactivation: true,
  createdAt: true,
  personneId: true,
  personne: {
    select: { id: true, nom: true, prenoms: true, matricule: true },
  },
  permissions: {
    select: { permission: true, accordeLe: true },
    orderBy: { permission: "asc" },
  },
} as const;

function parseId(value: string | string[] | undefined): number {
  const result = idSchema.safeParse(typeof value === "string" ? value : undefined);
  if (!result.success) {
    throw new AppError("Identifiant de compte invalide.", 400, "INVALID_ACCOUNT_ID");
  }
  return result.data;
}

function generateTemporaryPassword(): string {
  return randomBytes(18).toString("base64url");
}

function translateAccountError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    throw new AppError("Cette adresse e-mail ou cet agent a déjà un compte.", 409, "ACCOUNT_ALREADY_EXISTS");
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2003"
  ) {
    throw new AppError("L’agent associé n’existe pas.", 404, "AGENT_NOT_FOUND");
  }
  throw error;
}

export async function listAccounts(_req: Request, res: Response) {
  const accounts = await prisma.utilisateur.findMany({
    orderBy: [{ email: "asc" }, { id: "asc" }],
    select: accountSelect,
  });
  res.json({ data: accounts });
}

export async function createAccount(req: Request, res: Response) {
  const data = createAccountSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await argon2.hash(temporaryPassword, {
    type: argon2.argon2id,
  });

  try {
    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.utilisateur.create({
        data: {
          email: data.email,
          personneId: data.personneId,
          role: data.role,
          passwordHash,
          mustChangePassword: true,
        },
        select: accountSelect,
      });
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "creation_compte",
          cible: String(created.id),
          details: `${created.email} (${created.role})`,
        },
      });
      return created;
    });

    res.status(201).json({
      data: account,
      temporaryPassword,
    });
  } catch (error) {
    translateAccountError(error);
  }
}

export async function updateAccountRole(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const { role } = changeRoleSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  try {
    const account = await prisma.$transaction(async (tx) => {
      const existing = await tx.utilisateur.findUnique({
        where: { id },
        select: { role: true },
      });
      if (!existing) {
        throw new AppError("Compte introuvable.", 404, "ACCOUNT_NOT_FOUND");
      }

      let updated = await tx.utilisateur.update({
        where: { id },
        data: { role },
        select: accountSelect,
      });
      if (existing.role !== role) {
        await tx.permissionUtilisateur.deleteMany({
          where: { utilisateurId: id },
        });
        updated = await tx.utilisateur.findUniqueOrThrow({
          where: { id },
          select: accountSelect,
        });
      }
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "changement_role",
          cible: String(id),
          details:
            existing.role === role
              ? `${existing.role} (inchangé)`
              : `${existing.role} → ${role}. Permissions déléguées révoquées.`,
        },
      });
      return updated;
    });
    res.json({ data: account });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Compte introuvable.", 404, "ACCOUNT_NOT_FOUND");
    }
    throw error;
  }
}

export async function updateAccountPermissions(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const { permissions } = updatePermissionsSchema.parse(req.body);
  const nextPermissions = [...new Set(permissions)];
  const user = getAuthenticatedUser(res);

  const account = await prisma.$transaction(async (tx) => {
    const target = await tx.utilisateur.findUnique({
      where: { id },
      select: {
        email: true,
        role: true,
        permissions: { select: { permission: true } },
      },
    });
    if (!target) {
      throw new AppError("Compte introuvable.", 404, "ACCOUNT_NOT_FOUND");
    }

    for (const permission of nextPermissions) {
      if (!isDelegablePermission(target.role, permission as Permission)) {
        throw new AppError(
          `La permission « ${permission} » ne peut pas être déléguée à ce rôle.`,
          400,
          "PERMISSION_NOT_DELEGABLE",
        );
      }
    }

    const previousPermissions = target.permissions.map(
      (permission) => permission.permission,
    );
    const added = nextPermissions.filter(
      (permission) => !previousPermissions.includes(permission),
    );
    const removed = previousPermissions.filter(
      (permission) => !nextPermissions.includes(permission),
    );

    await tx.permissionUtilisateur.deleteMany({
      where: { utilisateurId: id },
    });
    if (nextPermissions.length > 0) {
      await tx.permissionUtilisateur.createMany({
        data: nextPermissions.map((permission) => ({
          utilisateurId: id,
          permission,
          accordeParId: user.id,
        })),
      });
    }

    if (added.length > 0 || removed.length > 0) {
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "gestion_permissions",
          cible: String(id),
          details: `Permissions déléguées de ${target.email} (${target.role}) : ajout [${added.join(", ") || "aucun"}], retrait [${removed.join(", ") || "aucun"}]. Liste finale : [${nextPermissions.join(", ") || "aucune"}].`,
        },
      });
    }

    const updated = await tx.utilisateur.findUniqueOrThrow({
      where: { id },
      select: accountSelect,
    });
    return updated;
  });

  res.json({ data: account });
}

export async function setAccountActive(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const data = disableSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  if (id === user.id && !data.isActive) {
    throw new AppError(
      "Vous ne pouvez pas désactiver votre propre compte.",
      409,
      "CANNOT_DISABLE_SELF",
    );
  }
  if (!data.isActive && !data.motifDesactivation) {
    throw new AppError(
      "Un motif est obligatoire pour désactiver un compte.",
      400,
      "DEACTIVATION_REASON_REQUIRED",
    );
  }

  try {
    const account = await prisma.$transaction(async (tx) => {
      const updated = await tx.utilisateur.update({
        where: { id },
        data: {
          isActive: data.isActive,
          dateDesactivation: data.isActive ? null : new Date(),
          motifDesactivation: data.isActive ? null : data.motifDesactivation,
          ...(data.isActive ? {} : { sessions: { deleteMany: {} } }),
        },
        select: accountSelect,
      });
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: data.isActive ? "reactivation_compte" : "desactivation_compte",
          cible: String(id),
          details: data.isActive ? "Réactivation" : "Désactivation",
          justification: data.motifDesactivation,
        },
      });
      return updated;
    });
    res.json({ data: account });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Compte introuvable.", 404, "ACCOUNT_NOT_FOUND");
    }
    throw error;
  }
}

export async function resetAccountPassword(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const user = getAuthenticatedUser(res);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await argon2.hash(temporaryPassword, {
    type: argon2.argon2id,
  });

  try {
    const account = await prisma.$transaction(async (tx) => {
      const updated = await tx.utilisateur.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
          sessions: { deleteMany: {} },
        },
        select: accountSelect,
      });
      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "reset_mot_de_passe",
          cible: String(id),
          details: "Réinitialisation du mot de passe ; sessions précédentes révoquées.",
        },
      });
      return updated;
    });
    res.json({ data: account, temporaryPassword });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new AppError("Compte introuvable.", 404, "ACCOUNT_NOT_FOUND");
    }
    throw error;
  }
}
