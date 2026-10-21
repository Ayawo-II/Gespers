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
    },
  });

  if (
    !utilisateur ||
    !utilisateur.isActive ||
    !utilisateur.passwordHash.startsWith("$argon2id$")
  ) {
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
    throw new AppError(
      "Adresse e-mail ou mot de passe incorrect.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.session.create({
      data: {
        tokenHash: hashSessionToken(rawToken),
        utilisateurId: utilisateur.id,
        expiresAt,
      },
    }),
  ]);

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
    },
  });
}

export async function getMe(_req: Request, res: Response) {
  res.json({ data: getAuthenticatedUser(res) });
}

export async function logout(req: Request, res: Response) {
  const token = getSessionToken(req);
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
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
