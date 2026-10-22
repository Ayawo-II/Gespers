import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(new AppError("Route introuvable.", 404, "NOT_FOUND"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      err = new AppError(
        "La taille maximale par fichier est de 10 Mo.",
        413,
        "FILE_TOO_LARGE",
      );
    } else {
      err = new AppError(
        "La requête d’upload est invalide.",
        400,
        "INVALID_UPLOAD",
      );
    }
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Les données fournies sont invalides.",
        details: err.issues.map(({ path, message }) => ({
          field: path.join("."),
          message,
        })),
      },
    });
    return;
  }

  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400 &&
    "type" in err &&
    err.type === "entity.parse.failed"
  ) {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Le corps de la requête contient un JSON invalide.",
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Une erreur interne est survenue.",
    },
  });
}
