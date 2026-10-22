import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/errorHandler.js";
import {
  getAuthenticatedUser,
  getSessionToken,
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from "../middlewares/authenticate.js";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;
const sessionCookieAttributes = [
  "Path=/",
  "HttpOnly",
  "SameSite=Lax",
  ...(env.nodeEnv === "production" ? ["Secure"] : []),
];

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(256),
});

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
      role: true,
      personneId: true,
      mustChangePassword: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!utilisateur) {
    await prisma.journalAudit.create({
      data: {
        identifiant: email,
        action: "connexion_echouee",
        cible: email,
        details: "Tentative de connexion avec un compte inexistant.",
      },
    });
    throw new AppError(
      "Adresse e-mail ou mot de passe incorrect.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const now = new Date();
  if (utilisateur.lockedUntil && utilisateur.lockedUntil > now) {
    throw new AppError(
      "Compte temporairement verrouillé après plusieurs tentatives échouées.",
      423,
      "ACCOUNT_TEMPORARILY_LOCKED",
    );
  }

  if (!utilisateur.isActive || !utilisateur.passwordHash.startsWith("$argon2id$")) {
    await prisma.journalAudit.create({
      data: {
        auteurId: utilisateur.id,
        identifiant: email,
        action: "connexion_echouee",
        cible: String(utilisateur.id),
        details: "Tentative de connexion à un compte inactif ou non initialisé.",
      },
    });
    throw new AppError(
      "Adresse e-mail ou mot de passe incorrect.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const passwordMatches = await argon2.verify(
    utilisateur.passwordHash,
    password,
  );
  if (!passwordMatches) {
    const accountLocked = await prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<
        { failedLoginAttempts: number; lockedUntil: Date | null }[]
      >`SELECT "failedLoginAttempts", "lockedUntil"
        FROM "Utilisateur" WHERE "id" = ${utilisateur.id} FOR UPDATE`;
      if (!current) {
        throw new AppError("Compte introuvable.", 404, "ACCOUNT_NOT_FOUND");
      }
      if (current.lockedUntil && current.lockedUntil > now) return true;

      const attempts = current.failedLoginAttempts + 1;
      const lockedUntil =
        attempts >= MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(now.getTime() + LOGIN_LOCK_DURATION_MS)
          : null;
      await tx.utilisateur.update({
        where: { id: utilisateur.id },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });
      await tx.journalAudit.create({
        data: {
          auteurId: utilisateur.id,
          identifiant: email,
          action: "connexion_echouee",
          cible: String(utilisateur.id),
          details: `Mot de passe incorrect (${Math.min(attempts, MAX_FAILED_LOGIN_ATTEMPTS)}/${MAX_FAILED_LOGIN_ATTEMPTS}).`,
        },
      });
      return lockedUntil !== null;
    });
    if (accountLocked) {
      throw new AppError(
        "Compte temporairement verrouillé après plusieurs tentatives échouées.",
        423,
        "ACCOUNT_TEMPORARILY_LOCKED",
      );
    }
    throw new AppError(
      "Adresse e-mail ou mot de passe incorrect.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await tx.utilisateur.update({
      where: { id: utilisateur.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    await tx.session.create({
      data: {
        tokenHash: hashSessionToken(rawToken),
        utilisateurId: utilisateur.id,
        expiresAt,
      },
    });
    await tx.journalAudit.create({
      data: {
        auteurId: utilisateur.id,
        identifiant: utilisateur.email,
        action: "connexion_reussie",
        cible: String(utilisateur.id),
        details: "Connexion réussie.",
      },
    });
  });

  res.setHeader(
    "Set-Cookie",
    [
      `${SESSION_COOKIE_NAME}=${rawToken}`,
      ...sessionCookieAttributes,
      `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
      `Expires=${expiresAt.toUTCString()}`,
    ].join("; "),
  );
  res.json({
    data: {
      id: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      personneId: utilisateur.personneId,
      mustChangePassword: utilisateur.mustChangePassword,
    },
  });
}

export async function getMe(_req: Request, res: Response) {
  res.json({ data: getAuthenticatedUser(res) });
}

export async function logout(req: Request, res: Response) {
  const token = getSessionToken(req);
  if (token) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: { utilisateur: { select: { id: true, email: true } } },
    });
    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { tokenHash: hashSessionToken(token) },
      });
      if (session) {
        await tx.journalAudit.create({
          data: {
            auteurId: session.utilisateur.id,
            identifiant: session.utilisateur.email,
            action: "deconnexion",
            cible: String(session.utilisateur.id),
            details: "Déconnexion.",
          },
        });
      }
    });
  }

  res.setHeader(
    "Set-Cookie",
    [
      `${SESSION_COOKIE_NAME}=`,
      ...sessionCookieAttributes,
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ].join("; "),
  );
  res.status(204).end();
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});

export async function changePassword(req: Request, res: Response) {
  const input = changePasswordSchema.parse(req.body);
  const user = getAuthenticatedUser(res);
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (
    !utilisateur ||
    !utilisateur.passwordHash.startsWith("$argon2id$") ||
    !(await argon2.verify(utilisateur.passwordHash, input.currentPassword))
  ) {
    throw new AppError(
      "Mot de passe actuel incorrect.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const passwordHash = await argon2.hash(input.newPassword, {
    type: argon2.argon2id,
  });
  await prisma.$transaction([
    prisma.utilisateur.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.journalAudit.create({
      data: {
        auteurId: user.id,
        identifiant: user.email,
        action: "changement_mot_de_passe",
        cible: String(user.id),
        details: "Mot de passe modifié par l’utilisateur.",
      },
    }),
  ]);
  res.status(204).end();
}
