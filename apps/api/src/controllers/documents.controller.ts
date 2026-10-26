import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";
import { documentReadWhere } from "../services/agent-access.js";
import {
  mimeTypeForStorageKey,
  removeStoredFile,
  resolveStoredFile,
  verifyFileSignature,
} from "../services/document-storage.js";

const idSchema = z.coerce.number().int().positive();
const dateOnlySchema = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));

const uploadMetadataSchema = z.object({
  titre: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  numeroOrdre: z.string().trim().max(100).optional(),
  reference: z.string().trim().max(150).optional(),
  expediteur: z.string().trim().max(200).optional(),
  dateDocument: dateOnlySchema.optional(),
  typeDocId: z.coerce.number().int().positive(),
  personneIds: z
    .preprocess((value) => {
      if (typeof value !== "string" || value.trim() === "") return [];
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, z.array(z.coerce.number().int().positive()).max(100))
    .default([]),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  personneId: z.coerce.number().int().positive().optional(),
  typeDocId: z.coerce.number().int().positive().optional(),
  dansRegistreGeneral: z.enum(["true", "false"]).optional(),
});

function parseId(value: string | string[] | undefined): number {
  const result = idSchema.safeParse(typeof value === "string" ? value : undefined);
  if (!result.success) {
    throw new AppError("Identifiant de document invalide.", 400, "INVALID_DOCUMENT_ID");
  }
  return result.data;
}

function dateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function serializeDocument<T extends { dateDocument: Date; dateAjout: Date }>(document: T) {
  return {
    ...document,
    dateDocument: dateString(document.dateDocument),
    dateAjout: dateString(document.dateAjout),
  };
}

export async function listDocumentTypes(_req: Request, res: Response) {
  const types = await prisma.typeDoc.findMany({
    orderBy: [{ libelle: "asc" }, { id: "asc" }],
  });
  res.json({ data: types });
}

export async function listDocuments(req: Request, res: Response) {
  const { page, limit, personneId, typeDocId, dansRegistreGeneral } =
    listQuerySchema.parse(req.query);
  const user = getAuthenticatedUser(res);
  const filters: Prisma.DocumentsWhereInput[] = [documentReadWhere(user)];
  if (personneId !== undefined) {
    filters.push({ personnes: { some: { personneId } } });
  }
  if (typeDocId !== undefined) {
    filters.push({ typeDocId });
  }
  if (dansRegistreGeneral !== undefined) {
    filters.push({ dansRegistreGeneral: dansRegistreGeneral === "true" });
  }
  const where: Prisma.DocumentsWhereInput = { AND: filters };
  const [documents, total] = await prisma.$transaction([
    prisma.documents.findMany({
      where,
      orderBy: [{ dateAjout: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        typeDoc: true,
        personnes: {
          include: {
            personne: {
              select: { id: true, nom: true, prenoms: true, matricule: true },
            },
          },
        },
        ajoutePar: { select: { id: true, email: true } },
      },
    }),
    prisma.documents.count({ where }),
  ]);
  res.json({
    data: documents.map(serializeDocument),
    meta: { page, limit, total },
  });
}

export async function getDocument(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const user = getAuthenticatedUser(res);
  const document = await prisma.documents.findFirst({
    where: { id, ...documentReadWhere(user) },
    include: {
      typeDoc: true,
      personnes: {
        include: {
          personne: {
            select: { id: true, nom: true, prenoms: true, matricule: true },
          },
        },
      },
      ajoutePar: { select: { id: true, email: true } },
    },
  });
  if (!document) {
    throw new AppError("Document introuvable.", 404, "DOCUMENT_NOT_FOUND");
  }
  res.json({ data: serializeDocument(document) });
}

export async function uploadDocument(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    throw new AppError("Un fichier est obligatoire.", 400, "FILE_REQUIRED");
  }

  const storageKey = file.filename;
  try {
    await verifyFileSignature(file.path, file.mimetype);

    const metadata = uploadMetadataSchema.parse(req.body);
    const distinctPersonneIds = [...new Set(metadata.personneIds)];
    const user = getAuthenticatedUser(res);
    const document = await prisma.$transaction(async (tx) => {
      const typeDoc = await tx.typeDoc.findUnique({
        where: { id: metadata.typeDocId },
        select: { id: true },
      });
      if (!typeDoc) {
        throw new AppError(
          "Type de document introuvable.",
          404,
          "DOCUMENT_TYPE_NOT_FOUND",
        );
      }

      if (distinctPersonneIds.length > 0) {
        const peopleCount = await tx.personnes.count({
          where: { id: { in: distinctPersonneIds } },
        });
        if (peopleCount !== distinctPersonneIds.length) {
          throw new AppError(
            "Un ou plusieurs agents sont introuvables.",
            404,
            "AGENT_NOT_FOUND",
          );
        }
      }

      const created = await tx.documents.create({
        data: {
          lien: storageKey,
          nomFichier: file.originalname,
          mimeType: file.mimetype,
          tailleOctets: file.size,
          titre: metadata.titre ?? file.originalname.slice(0, 200),
          description: metadata.description,
          numeroOrdre: metadata.numeroOrdre,
          reference: metadata.reference,
          expediteur: metadata.expediteur,
          dateDocument: metadata.dateDocument ?? new Date(),
          dateAjout: new Date(),
          dansRegistreGeneral: distinctPersonneIds.length === 0,
          typeDocId: metadata.typeDocId,
          ajouteParId: user.id,
          personnes: {
            create: distinctPersonneIds.map((personneId) => ({
              personne: { connect: { id: personneId } },
            })),
          },
        },
        include: {
          typeDoc: true,
          personnes: {
            include: {
              personne: {
                select: { id: true, nom: true, prenoms: true, matricule: true },
              },
            },
          },
          ajoutePar: { select: { id: true, email: true } },
        },
      });

      await tx.journalAudit.create({
        data: {
          auteurId: user.id,
          identifiant: user.email,
          action: "archivage_document",
          cible: String(created.id),
          details: `${created.titre} (${distinctPersonneIds.length === 0 ? "registre général" : `${distinctPersonneIds.length} agent(s)`})`,
        },
      });
      return created;
    });

    res.status(201).json({ data: serializeDocument(document) });
  } catch (error) {
    if (storageKey) {
      try {
        await removeStoredFile(storageKey);
      } catch (cleanupError) {
        console.error("Impossible de supprimer le fichier après l’échec de l’archivage.", cleanupError);
      }
    }
    throw error;
  }
}

export async function downloadDocument(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const user = getAuthenticatedUser(res);
  const document = await prisma.documents.findFirst({
    where: { id, ...documentReadWhere(user) },
    select: { lien: true, nomFichier: true, mimeType: true },
  });
  if (!document) {
    throw new AppError("Document introuvable.", 404, "DOCUMENT_NOT_FOUND");
  }

  const mimeType = document.mimeType ?? mimeTypeForStorageKey(document.lien);
  const filePath = resolveStoredFile(document.lien);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", mimeType);
  res.download(filePath, document.nomFichier ?? `document-${id}`, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({
        error: {
          code: "DOCUMENT_FILE_NOT_FOUND",
          message: "Le fichier archivé est introuvable sur le stockage.",
        },
      });
    }
  });
}
