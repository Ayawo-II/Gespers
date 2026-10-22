import { ZipArchive } from "archiver";
import ExcelJS from "exceljs";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import PDFDocument from "pdfkit";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { AppError } from "../middlewares/errorHandler.js";
import { agentReadWhere } from "../services/agent-access.js";
import { resolveStoredFile } from "../services/document-storage.js";

const MAX_EXPORT_ROWS = 50_000;
const AGENT_EXPORT_HEADERS = [
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
] as const;

function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function formatDate(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}

async function getExportAgents() {
  const total = await prisma.personnes.count();
  if (total > MAX_EXPORT_ROWS) {
    throw new AppError(
      `L’export dépasse la limite de ${MAX_EXPORT_ROWS} agents. Utilisez les filtres de l’API de liste.`,
      413,
      "EXPORT_TOO_LARGE",
    );
  }

  return prisma.personnes.findMany({
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
}

function getAgentExportValues(agent: Awaited<ReturnType<typeof getExportAgents>>[number]) {
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
  ] as const;
}

async function auditExport(userId: number, email: string, action: string, count: number) {
  await prisma.journalAudit.create({
    data: {
      auteurId: userId,
      identifiant: email,
      action,
      cible: "agents",
      details: `Export RH : ${count} agent(s).`,
    },
  });
}

export async function exportAgentsCsv(_req: Request, res: Response) {
  const agents = await getExportAgents();
  const rows = agents.map((agent) => getAgentExportValues(agent).map(csvCell).join(","));
  const user = getAuthenticatedUser(res);
  await auditExport(user.id, user.email, "export_agents_csv", agents.length);

  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agents-rh.csv"',
      "Cache-Control": "no-store",
    })
    .send(`\uFEFF${AGENT_EXPORT_HEADERS.map(csvCell).join(",")}\r\n${rows.join("\r\n")}\r\n`);
}

export async function exportAgentsXlsx(_req: Request, res: Response) {
  const agents = await getExportAgents();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gespers";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Agents RH");
  worksheet.addRow([...AGENT_EXPORT_HEADERS]);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const agent of agents) {
    worksheet.addRow([...getAgentExportValues(agent)]);
  }
  worksheet.columns = AGENT_EXPORT_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length + 2),
  }));
  const user = getAuthenticatedUser(res);
  await auditExport(user.id, user.email, "export_agents_xlsx", agents.length);
  const buffer = await workbook.xlsx.writeBuffer();
  res.status(200).set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": 'attachment; filename="agents-rh.xlsx"',
    "Cache-Control": "no-store",
  }).send(Buffer.from(buffer));
}

export async function exportAgentsPdf(_req: Request, res: Response) {
  const agents = await getExportAgents();
  const user = getAuthenticatedUser(res);
  await auditExport(user.id, user.email, "export_agents_pdf", agents.length);
  res.status(200).set({
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="agents-rh.pdf"',
    "Cache-Control": "no-store",
  });
  const pdf = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 36, bottom: 36, left: 36, right: 36 },
    autoFirstPage: true,
  });
  pdf.on("error", (error: Error) => {
    console.error("Échec de génération du rapport PDF des agents.", error);
    res.destroy(error);
  });
  pdf.pipe(res);
  pdf.fontSize(14).text("État RH des agents", { align: "center" });
  pdf.moveDown(0.5);
  pdf.fontSize(8).text(`Généré le ${new Date().toISOString().slice(0, 10)} — ${agents.length} agent(s)`);
  pdf.moveDown();
  for (const agent of agents) {
    if (pdf.y > 520) pdf.addPage();
    const values = getAgentExportValues(agent);
    pdf.fontSize(9).font("Helvetica-Bold").text(`${values[0]} — ${values[1]} ${values[2]}`);
    pdf.fontSize(8).font("Helvetica").text(
      `${values[3]} | ${values[4] ?? ""} ${values[5] ?? ""} ${values[6] ?? ""} | ${values[7]} | ${values[8]} | Entrée : ${values[9]} | Division : ${values[10]} | Section : ${values[11]} | Archivé : ${values[12]}`,
    );
    pdf.moveDown(0.45);
  }
  pdf.end();
}

export async function exportAgentDossierZip(req: Request, res: Response) {
  const personneId = z.coerce.number().int().positive().parse(req.params.id);
  const user = getAuthenticatedUser(res);
  const agent = await prisma.personnes.findFirst({
    where: { id: personneId, ...agentReadWhere(user) },
    include: {
      titularisation: true,
      historiqueCarriere: { orderBy: [{ dateEffet: "asc" }, { id: "asc" }] },
      historique: {
        orderBy: [{ dateEffet: "asc" }, { id: "asc" }],
        include: {
          modificateur: { select: { id: true, email: true } },
          pieceJustificative: { select: { id: true, titre: true } },
        },
      },
      historiqueAffectations: {
        orderBy: [{ dateDebut: "asc" }, { id: "asc" }],
        include: {
          section: { select: { id: true, libelle: true, division: { select: { id: true, libelle: true } } } },
        },
      },
      affectations: {
        include: {
          section: { select: { id: true, libelle: true, division: { select: { id: true, libelle: true } } } },
        },
      },
      conges: {
        orderBy: [{ dateDebut: "asc" }, { id: "asc" }],
        include: { document: { select: { id: true, titre: true, nomFichier: true } } },
      },
      documents: {
        include: {
          document: {
            include: {
              typeDoc: true,
              versions: {
                orderBy: [{ remplaceLe: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  lien: true,
                  nomFichier: true,
                  mimeType: true,
                  tailleOctets: true,
                  remplaceLe: true,
                },
              },
            },
          },
        },
      },
      courriers: { orderBy: [{ date: "asc" }, { id: "asc" }] },
    },
  });
  if (!agent) {
    throw new AppError("Agent introuvable.", 404, "AGENT_NOT_FOUND");
  }

  const documents = await prisma.documents.findMany({
    where: {
      OR: [
        { personnes: { some: { personneId: agent.id } } },
        { modsJustifie: { is: { personneId: agent.id } } },
        { conges: { some: { personneId: agent.id } } },
        { courrier: { is: { personneId: agent.id } } },
      ],
    },
    include: {
      typeDoc: true,
      versions: {
        orderBy: [{ remplaceLe: "asc" }, { id: "asc" }],
        select: {
          id: true,
          lien: true,
          nomFichier: true,
          mimeType: true,
          tailleOctets: true,
          remplaceLe: true,
        },
      },
    },
    orderBy: [{ dateDocument: "asc" }, { id: "asc" }],
  });

  const allFiles = documents.flatMap((document) => [
    { id: document.id, name: `documents/${safeArchiveName(document.nomFichier, document.id)}`, lien: document.lien },
    ...document.versions.map((version) => ({
      id: version.id,
      name: `documents/versions/${safeArchiveName(version.nomFichier, version.id)}`,
      lien: version.lien,
    })),
  ]);
  if (allFiles.length > 100) {
    throw new AppError(
      "Le dossier dépasse la limite de 100 fichiers, versions comprises.",
      413,
      "EXPORT_TOO_LARGE",
    );
  }
  const files = await Promise.all(
    allFiles.map(async (file) => {
      const filePath = resolveStoredFile(file.lien);
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
          `Un fichier du dossier (${file.id}) est manquant sur le stockage.`,
          404,
          "DOCUMENT_FILE_NOT_FOUND",
        );
      }
      return { ...file, filePath };
    }),
  );

  await prisma.journalAudit.create({
    data: {
      auteurId: user.id,
      identifiant: user.email,
      action: "export_dossier_agent",
      cible: String(agent.id),
      details: `Export complet du dossier agent ${agent.matricule}, ${files.length} fichier(s).`,
    },
  });

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (error: Error) => {
    console.error("Échec de création de l’archive ZIP du dossier agent.", error);
    res.destroy(error);
  });
  res.on("close", () => {
    if (!res.writableEnded) archive.abort();
  });
  const safeMatricule = agent.matricule.replace(/[^a-zA-Z0-9_-]/g, "_");
  res.status(200).set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="dossier-${safeMatricule}.zip"`,
    "Cache-Control": "no-store",
  });
  archive.pipe(res);
  const { documents: _linkedDocuments, ...dossier } = agent;
  archive.append(
    Buffer.from(
      JSON.stringify(
        {
          ...dossier,
          documents: documents.map((document) => ({
            ...document,
            lien: undefined,
            versions: document.versions.map(({ lien: _lien, ...version }) => version),
          })),
          fichiers: files.map(({ id, name }) => ({ id, cheminDansArchive: name })),
          exporteLe: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    ),
    { name: "dossier-agent.json" },
  );
  for (const file of files) {
    archive.append(createReadStream(file.filePath), { name: file.name });
  }
  await archive.finalize();
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
  const ids = query.ids
    ? [...new Set(query.ids.split(",").map((value) => z.coerce.number().int().positive().parse(value)))]
    : undefined;
  if (ids && (ids.length === 0 || ids.length > 100)) {
    throw new AppError("Sélectionnez entre 1 et 100 documents.", 400, "INVALID_DOCUMENT_SELECTION");
  }
  if (ids && (query.personneId !== undefined || query.typeDocId !== undefined || query.dansRegistreGeneral !== undefined)) {
    throw new AppError("Utilisez soit une liste d’IDs, soit des filtres.", 400, "MIXED_DOCUMENT_SELECTION");
  }

  const where = ids
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

  const user = getAuthenticatedUser(res);
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
