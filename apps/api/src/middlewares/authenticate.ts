import { createHash } from "node:crypto";
import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "./errorHandler.js";

export const SESSION_COOKIE_NAME = "gespers_session";
const SESSION_COOKIE_PREFIX = `${SESSION_COOKIE_NAME}=`;

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
  personneId: number;
}

declare global {
  namespace Express {
    interface Locals {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

export function getSessionToken(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(SESSION_COOKIE_PREFIX));

  return cookie?.slice(SESSION_COOKIE_PREFIX.length) || undefined;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = getSessionToken(req);
  if (!token) {
    next(new AppError("Authentification requise.", 401, "UNAUTHENTICATED"));
    return;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      expiresAt: true,
      utilisateur: {
        select: {
          id: true,
          email: true,
          role: true,
          personneId: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.utilisateur.isActive
  ) {
    next(new AppError("Session invalide ou expirée.", 401, "INVALID_SESSION"));
    return;
  }

  res.locals.authenticatedUser = {
    id: session.utilisateur.id,
    email: session.utilisateur.email,
    role: session.utilisateur.role,
    personneId: session.utilisateur.personneId,
  };
  next();
}

export function getAuthenticatedUser(res: Response): AuthenticatedUser {
  const user = res.locals.authenticatedUser;
  if (!user) {
    throw new AppError("Authentification requise.", 401, "UNAUTHENTICATED");
  }
  return user;
}
