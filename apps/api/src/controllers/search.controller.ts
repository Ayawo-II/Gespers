import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { getAuthenticatedUser } from "../middlewares/authenticate.js";
import { hasPermission, type Permission } from "../middlewares/authorize.js";
import {
  agentReadWhere,
  documentReadWhere,
} from "../services/agent-access.js";

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
  typeAgent: z.enum(["FONCTIONNAIRE", "CONTRACTUEL", "PIGISTE"]).optional(),
  etatCarriere: z.enum(["STAGIAIRE", "TITULAIRE", "SORTI"]).optional(),
  divisionId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  typeDocId: z.coerce.number().int().positive().optional(),
});

export async function searchGlobally(req: Request, res: Response) {
  const { q, typeAgent, etatCarriere, divisionId, sectionId, typeDocId } =
    querySchema.parse(req.query);
  const user = getAuthenticatedUser(res);
  const canSearchAgents = [
    "agents.read.all",
    "agents.read.team",
    "agents.read.self",
  ] satisfies Permission[];
  const canSearchAgentsForUser = canSearchAgents.some((permission) =>
    hasPermission(user.role, permission),
  );
  const canSearchCorrespondence = hasPermission(user.role, "courriers.read");
  const canSearchDocuments = [
    "documents.read.all",
    "documents.read.team",
    "documents.read.self",
  ] satisfies Permission[];
  const canSearchDocumentsForUser = canSearchDocuments.some((permission) =>
    hasPermission(user.role, permission),
  );

  const [agents, courriers, documents] = await Promise.all([
    canSearchAgentsForUser
      ? prisma.personnes.findMany({
          where: {
            AND: [
              agentReadWhere(user),
              { estArchive: false },
              ...(typeAgent ? [{ typeAgent }] : []),
              ...(etatCarriere ? [{ etatCarriere }] : []),
              ...(divisionId || sectionId
                ? [{
                    affectations: {
                      some: {
                        ...(sectionId ? { sectionId } : {}),
                        ...(divisionId ? { section: { divisionId } } : {}),
                      },
                    },
                  }]
                : []),
              {
                OR: [
                  { nom: { contains: q, mode: "insensitive" } },
                  { prenoms: { contains: q, mode: "insensitive" } },
                  { matricule: { contains: q, mode: "insensitive" } },
                  { fonction: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          },
          take: 10,
          orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
          select: {
            id: true,
            nom: true,
            prenoms: true,
            matricule: true,
            fonction: true,
            categorie: true,
            classe: true,
            echelon: true,
          },
        })
      : Promise.resolve([]),
    canSearchCorrespondence
      ? prisma.courrier.findMany({
          where: {
            OR: [
              { reference: { contains: q, mode: "insensitive" } },
              { objet: { contains: q, mode: "insensitive" } },
              { expediteur: { contains: q, mode: "insensitive" } },
              { destinataire: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 10,
          orderBy: [{ date: "desc" }, { id: "desc" }],
          select: { id: true, reference: true, type: true, date: true, objet: true },
        })
      : Promise.resolve([]),
    canSearchDocumentsForUser
      ? prisma.documents.findMany({
          where: {
            AND: [
              documentReadWhere(user),
              ...(typeDocId ? [{ typeDocId }] : []),
              {
                OR: [
                  { titre: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { reference: { contains: q, mode: "insensitive" } },
                  { numeroOrdre: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          },
          take: 10,
          orderBy: [{ dateAjout: "desc" }, { id: "desc" }],
          select: {
            id: true,
            titre: true,
            reference: true,
            dateDocument: true,
            dansRegistreGeneral: true,
          },
        })
      : Promise.resolve([]),
  ]);

  res.json({
    data: {
      agents,
      courriers: courriers.map((courrier) => ({
        ...courrier,
        date: courrier.date.toISOString().slice(0, 10),
      })),
      documents: documents.map((document) => ({
        ...document,
        dateDocument: document.dateDocument.toISOString().slice(0, 10),
      })),
    },
    available: {
      agents: canSearchAgentsForUser,
      courriers: canSearchCorrespondence,
      documents: canSearchDocumentsForUser,
    },
  });
}
