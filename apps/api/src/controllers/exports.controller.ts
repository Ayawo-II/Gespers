import { ZipArchive } from "archiver";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";
import { documentReadWhere } from "../services/agent-access.js";
import { resolveStoredFile } from "../services/document-storage.js";

const MAX_EXPORT_ROWS = 50_000;

function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function formatDate(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}

export async function exportAgentsCsv(_req: Request, res: Response) {
  const total = await prisma.personnes.count();
  if (total > MAX_EXPORT_ROWS) {
    throw new AppError(
      `L’export dépasse la limite de ${MAX_EXPORT_ROWS} agents. Utilisez les filtres de l’API de liste.`,
      413,
      "EXPORT_TOO_LARGE",
    );
  }

  const agents = await prisma.personnes.findMany({
    orderBy: [{ nom: "asc" }, { prenoms: "asc" }, { id: "asc" }],
    select: {
      matricule: true,
      nom: true,
      prenoms: true,
      fonction: true,
      categorie: true,
      classe: true,
      echelon: true,
      typeAgent: true,
      etatCarriere: true,
      dateEntree: true,
      estArchive: true,
      affectations: {
        select: {
          section: {
            select: {
              libelle: true,
              division: { select: { libelle: true } },
            },
          },
        },
      },
    },
  });
  const header = [
    "matricule",
    "nom",
    "prenoms",
    "fonction",
    "categorie",
    "classe",
    "echelon",
    "type_agent",
    "etat_carriere",
    "date_entree",
    "division",
    "section",
    "archive",
  ];
  const rows = agents.map((agent) => {
    const divisions = [...new Set(agent.affectations.map(({ section }) => section.division.libelle))];
    const sections = [...new Set(agent.affectations.map(({ section }) => section.libelle))];
    return [
      agent.matricule,
      agent.nom,
      agent.prenoms,
      agent.fonction,
      agent.categorie,
      agent.classe,
      agent.echelon,
      agent.typeAgent,
      agent.etatCarriere,
      formatDate(agent.dateEntree),
      divisions.join("; "),
      sections.join("; "),
      agent.estArchive ? "oui" : "non",
    ]
      .map(csvCell)
      .join(",");
  });

  const user = getAuthenticatedUser(res);
  await prisma.journalAudit.create({
    data: {
      auteurId: user.id,
      identifiant: user.email,
      action: "export_agents_csv",
      cible: "agents",
      details: `Export CSV RH : ${agents.length} agent(s).`,
    },
  });

  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agents-rh.csv"',
      "Cache-Control": "no-store",
    })
    .send(`\uFEFF${header.map(csvCell).join(",")}\r\n${rows.join("\r\n")}\r\n`);
}

const documentExportQuerySchema = z
  .object({
    ids: z.string().trim().optional(),
    personneId: z.coerce.number().int().positive().optional(),
    typeDocId: z.coerce.number().int().positive().optional(),
    dansRegistreGeneral: z.enum(["true", "false"]).optional(),
  })
  .strict()
  .refine(
    ({ ids, personneId, typeDocId, dansRegistreGeneral }) =>
      Boolean(ids) || personneId !== undefined || typeDocId !== undefined || dansRegistreGeneral !== undefined,
    { message: "Indiquez des IDs ou au moins un filtre de documents." },
  );

function safeArchiveName(originalName: string | null, id: number): string {
  const normalized = (originalName ?? `document-${id}`).replaceAll("\\", "/");
  const basename = normalized.split("/").pop() || `document-${id}`;
  const safe = basename.replace(/[\u0000-\u001f<>:"|?*]/g, "_").slice(0, 150);
  return `${id}-${safe || `document-${id}`}`;
}

export async function exportDocumentsZip(req: Request, res: Response) {
  const query = documentExportQuerySchema.parse(req.query);
  const user = getAuthenticatedUser(res);
  const scope = documentReadWhere(user);
  const ids = query.ids
    ? [...new Set(query.ids.split(",").map((value) => z.coerce.number().int().positive().parse(value)))]
    : undefined;
  if (ids && (ids.length === 0 || ids.length > 100)) {
    throw new AppError("Sélectionnez entre 1 et 100 documents.", 400, "INVALID_DOCUMENT_SELECTION");
  }
  if (ids && (query.personneId !== undefined || query.typeDocId !== undefined || query.dansRegistreGeneral !== undefined)) {
    throw new AppError("Utilisez soit une liste d’IDs, soit des filtres.", 400, "MIXED_DOCUMENT_SELECTION");
  }

  const filters = ids
    ? { id: { in: ids } }
    : {
        ...(query.personneId !== undefined
          ? { personnes: { some: { personneId: query.personneId } } }
          : {}),
        ...(query.typeDocId !== undefined ? { typeDocId: query.typeDocId } : {}),
        ...(query.dansRegistreGeneral !== undefined
          ? { dansRegistreGeneral: query.dansRegistreGeneral === "true" }
          : {}),
      };
  const where = { AND: [scope, filters] };
  const documents = await prisma.documents.findMany({
    where,
    orderBy: [{ dateAjout: "desc" }, { id: "desc" }],
    take: 101,
    select: { id: true, lien: true, nomFichier: true },
  });

  if (ids && documents.length !== ids.length) {
    throw new AppError(
      "Un ou plusieurs documents sélectionnés sont introuvables.",
      404,
      "DOCUMENT_NOT_FOUND",
    );
  }
  if (documents.length === 0) {
    throw new AppError("Aucun document ne correspond à la sélection.", 404, "DOCUMENT_NOT_FOUND");
  }
  if (documents.length > 100) {
    throw new AppError("La sélection dépasse la limite de 100 documents.", 413, "EXPORT_TOO_LARGE");
  }

  const files = await Promise.all(
    documents.map(async (document) => {
      const filePath = resolveStoredFile(document.lien);
      try {
        await stat(filePath);
      } catch (error) {
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          throw error;
        }
        throw new AppError(
          `Le fichier du document ${document.id} est manquant sur le stockage.`,
          404,
          "DOCUMENT_FILE_NOT_FOUND",
        );
      }
      return { document, filePath };
    }),
  );

  await prisma.journalAudit.create({
    data: {
      auteurId: user.id,
      identifiant: user.email,
      action: "export_documents_zip",
      cible: "documents",
      details: `Export ZIP de ${documents.length} document(s) : ${documents.map(({ id }) => id).join(", ")}.`,
    },
  });

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (error: Error) => {
    console.error("Échec de création de l’archive ZIP des documents.", error);
    res.destroy(error);
  });
  res.on("close", () => {
    if (!res.writableEnded) archive.abort();
  });
  res.status(200).set({
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="documents-archives.zip"',
    "Cache-Control": "no-store",
  });
  archive.pipe(res);
  for (const { document, filePath } of files) {
    archive.append(createReadStream(filePath), {
      name: safeArchiveName(document.nomFichier, document.id),
    });
  }
  await archive.finalize();
}
