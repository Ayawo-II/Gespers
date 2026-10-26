import type {
  Affectation,
  Agent,
  Avancement,
  Compte,
  Conge,
  Courrier,
  Division,
  DocumentDossier,
  EntreeAudit,
  ResultatExamen,
  Role,
  Section,
  Titularisation,
  TypeConge,
  TypeCourrier,
  TypeDocument,
  MotifDepart,
} from "@/lib/types";

type ApiRecord = Record<string, unknown>;

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const optStr = (v: unknown): string | undefined =>
  v === null || v === undefined || v === "" ? undefined : String(v);
const num = (v: unknown, fallback = 0): number =>
  v === null || v === undefined || v === "" ? fallback : Number(v);

export function roleToApi(role: Role): string {
  const upper = role.toUpperCase();
  const map: Record<string, string> = {
    AGENT: "AGENT",
    CHEF: "CHEF_SECTION",
    CHEF_SECTION: "CHEF_SECTION",
    CHEF_DIVISION: "CHEF_DIVISION",
    RH: "RESPONSABLE_RH",
    RESPONSABLE_RH: "RESPONSABLE_RH",
    CHEF_PERSONNEL: "CHEF_PERSONNEL",
    DG: "DG",
  };
  return map[upper] ?? "AGENT";
}

export function roleFromApi(role: unknown): Role {
  return str(role) as Role;
}

const TYPE_AGENT_TO_API: Record<string, string> = {
  fonctionnaire: "FONCTIONNAIRE",
  contractuel: "CONTRACTUEL",
  pigiste: "PIGISTE",
  pivote: "PIGISTE",
  FONCTIONNAIRE: "FONCTIONNAIRE",
  CONTRACTUEL: "CONTRACTUEL",
  PIGISTE: "PIGISTE",
  PIVOTE: "PIGISTE",
};

export function typeAgentToApi(value: unknown): string {
  return TYPE_AGENT_TO_API[str(value)] ?? "FONCTIONNAIRE";
}

const ETAT_TO_API: Record<string, string> = {
  stagiaire: "STAGIAIRE",
  titulaire: "TITULAIRE",
  fin_parcours: "SORTI",
  sorti: "SORTI",
  STAGIAIRE: "STAGIAIRE",
  TITULAIRE: "TITULAIRE",
  SORTI: "SORTI",
};

export function etatCarriereToApi(value: unknown): string {
  return ETAT_TO_API[str(value)] ?? "STAGIAIRE";
}

const MOTIF_TO_API: Record<string, string> = {
  retraite: "RETRAITE",
  demission: "DEMISSION",
  revocation: "REVOCATION",
  deces: "DECES",
  fin_contrat: "AUTRE",
  autre: "AUTRE",
  RETRAITE: "RETRAITE",
  DEMISSION: "DEMISSION",
  REVOCATION: "REVOCATION",
  DECES: "DECES",
  AUTRE: "AUTRE",
};

export function motifDepartToApi(value: unknown): MotifDepart {
  return (MOTIF_TO_API[str(value)] ?? "AUTRE") as MotifDepart;
}

const CONGE_TO_API: Record<string, TypeConge> = {
  annuel: "annuel",
  maladie: "maladie",
  maternite: "maternite",
  paternite: "paternite",
  permission_exceptionnelle: "permission_exceptionnelle",
  sans_solde: "sans_solde",
  ANNUEL: "annuel",
  MALADIE: "maladie",
  MATERNITE: "maternite",
  PATERNITE: "paternite",
  PERMISSION_EXCEPTIONNELLE: "permission_exceptionnelle",
  SANS_SOLDE: "sans_solde",
};

export function congeTypeToApi(value: unknown): string {
  const key = str(value);
  return (CONGE_TO_API[key] ?? key).toUpperCase();
}

const COURRIER_TO_API: Record<string, TypeCourrier> = {
  entrant: "entrant",
  sortant: "sortant",
  circulaire: "circulaire",
  arrete_ministeriel: "courrier_simple",
  courrier_simple: "courrier_simple",
  ENTRANT: "entrant",
  SORTANT: "sortant",
  CIRCULAIRE: "circulaire",
  ARRETE_MINISTERIEL: "courrier_simple",
  COURRIER_SIMPLE: "courrier_simple",
};

export function courrierTypeToApi(value: unknown): string {
  const key = str(value);
  return (COURRIER_TO_API[key] ?? key).toUpperCase();
}

export function courrierTypeFromApi(value: unknown): TypeCourrier {
  return str(value).toLowerCase() as TypeCourrier;
}

export const TYPE_DOC_TO_API: Record<TypeDocument, string> = {
  piece_identite: "Pièce d'identité",
  diplome: "Diplôme",
  arrete: "Arrêté",
  contrat: "Contrat",
  decision: "Décision",
  justificatif_conge: "Justificatif de congé",
  courrier: "Courrier",
  autre: "Autre",
};

const TYPE_DOC_FROM_LABEL: Record<string, TypeDocument> = Object.fromEntries(
  (Object.entries(TYPE_DOC_TO_API) as Array<[TypeDocument, string]>).map(
    ([key, label]) => [label.toLowerCase(), key],
  ),
);

export function typeDocIdForType(
  type: TypeDocument,
  types: Array<{ id: number; libelle: string }>,
): number | undefined {
  const label = TYPE_DOC_TO_API[type]?.toLowerCase();
  return types.find((t) => t.libelle.toLowerCase() === label)?.id;
}

export function typeDocTypeFromLabel(libelle: string): TypeDocument {
  return TYPE_DOC_FROM_LABEL[libelle.toLowerCase()] ?? "autre";
}

export function mapAgent(a: ApiRecord): Agent {
  const titularisation = (a.titularisation as ApiRecord | null | undefined) ?? null;
  const dateDepart = optStr(a.dateDepart);
  const affectations = Array.isArray(a.affectations) ? (a.affectations as ApiRecord[]) : [];
  const affectationSectionId = affectations[0]?.sectionId;
  return {
    id: str(a.id),
    nom: str(a.nom),
    prenoms: str(a.prenoms),
    dateNaissance: str(a.dateNaissance) || "",
    lieuNaissance: str(a.lieuNaissance) || "",
    sexe: str(a.sexe) as Agent["sexe"],
    nbreEnfant: num(a.nbreEnfant),
    nomPersonnePrevenir: str(a.nomPersonnePrevenir),
    contactPersonnePrevenir: str(a.contactPersonnePrevenir),
    telephone: str(a.telephone),
    adresse: str(a.adresse),
    diplome: str(a.diplome),
    fonction: str(a.fonction),
    matricule: str(a.matricule),
    categorie: (a.categorie ?? "C") as Agent["categorie"],
    classe: (a.classe ?? "CLASSE_3") as Agent["classe"],
    echelon: num(a.echelon),
    indice: num(a.indice),
    typeAgent: str(a.typeAgent) as Agent["typeAgent"],
    etatCarriere: str(a.etatCarriere) as Agent["etatCarriere"],
    dateEntree: str(a.dateEntree),
    dateDebutStage: (a.dateDebutStage as string | null) ?? null,
    dateFinStagePrevue: (a.dateFinStagePrevue as string | null) ?? null,
    dateFinContrat: (a.dateFinContrat as string | null) ?? null,
    dateDernierAvancement: (a.dateDernierAvancement as string | null) ?? null,
    dateDepart,
    motifDepart: (a.motifDepart as Agent["motifDepart"]) ?? null,
    estArchive: (a.estArchive as boolean) ?? false,
    membreAral: (a.membreAral as boolean) ?? false,
    photo: (a.photo as string) ?? undefined,
    sectionId: affectationSectionId != null ? String(affectationSectionId) : undefined,
    email: optStr(a.email),
    chefId: a.chefId ? str(a.chefId) : undefined,
    service: optStr(a.service),
    poste: str(a.fonction) || undefined,
    statut: str(a.typeAgent) as Agent["statut"],
    situation: str(a.etatCarriere) as Agent["situation"],
    nombreEnfants: num(a.nbreEnfant),
    nationalite: optStr(a.nationalite),
    situationMatrimoniale: optStr(a.situationMatrimoniale),
    formation: optStr(a.formation),
    dateTitularisation: titularisation ? optStr(titularisation.dateEffet) : undefined,
    examenTitularisation: titularisation
      ? {
          date: str(titularisation.dateExamen),
          resultat: titularisation.resultat as ResultatExamen,
          reference: str(titularisation.referenceDecision),
        }
      : undefined,
    finParcours: dateDepart
      ? {
          type: ((a.motifDepart as Agent["motifDepart"]) ?? "AUTRE") as NonNullable<
            Agent["finParcours"]
          >["type"],
          date: dateDepart,
          motif: "",
        }
      : undefined,
  };
}

export function mapAffectations(
  a: ApiRecord,
  sections: Section[],
  divisions: Division[],
): Affectation[] {
  const raw = Array.isArray(a.affectations) ? (a.affectations as ApiRecord[]) : [];
  return raw.map((aff, index) => {
    const sectionId = aff.sectionId ? str(aff.sectionId) : undefined;
    const section = sectionId ? sections.find((s) => s.id === sectionId) : undefined;
    const division = section ? divisions.find((d) => d.id === section.divisionId) : undefined;
    return {
      id: `${str(a.id)}-${sectionId ?? index}`,
      agentId: str(a.id),
      personneId: str(a.id),
      sectionId,
      service: section
        ? division
          ? `${division.libelle} · ${section.libelle}`
          : section.libelle
        : undefined,
    };
  });
}

export function agentToApiPayload(agent: Agent, isNew: boolean): Record<string, unknown> {
  const base: Record<string, unknown> = {
    nom: agent.nom,
    prenoms: agent.prenoms,
    dateNaissance: agent.dateNaissance,
    lieuNaissance: agent.lieuNaissance || "Lomé",
    sexe: agent.sexe,
    nbreEnfant: num(agent.nbreEnfant ?? agent.nombreEnfants),
    nomPersonnePrevenir: agent.nomPersonnePrevenir || "",
    contactPersonnePrevenir: agent.contactPersonnePrevenir || "",
    telephone: agent.telephone || "",
    adresse: agent.adresse || "",
    diplome: agent.diplome || "",
    matricule: agent.matricule,
    typeAgent: typeAgentToApi(agent.typeAgent || agent.statut),
    email: agent.email || null,
    nationalite: agent.nationalite || null,
    situationMatrimoniale: agent.situationMatrimoniale || null,
    formation: agent.formation || null,
    service: agent.service || null,
    membreAral: agent.membreAral ?? false,
    photo: agent.photo || null,
    chefId: agent.chefId ? Number(agent.chefId) : null,
    ...(agent.sectionId ? { sectionId: Number(agent.sectionId) } : {}),
  };
  if (isNew) {
    return {
      ...base,
      fonction: agent.fonction || agent.poste || "",
      categorie: agent.categorie || null,
      classe: agent.classe || null,
      echelon: agent.echelon === "" ? null : num(agent.echelon),
      indice: agent.indice === undefined ? null : num(agent.indice),
      etatCarriere: etatCarriereToApi(agent.etatCarriere || agent.situation),
      dateEntree: agent.dateEntree,
      dateDebutStage: agent.dateDebutStage ?? null,
      dateFinStagePrevue: agent.dateFinStagePrevue ?? null,
      dateFinContrat: agent.dateFinContrat ?? null,
    };
  }
  return base;
}

export function mapCompte(c: ApiRecord): Compte {
  const email = str(c.email);
  return {
    id: str(c.id),
    identifiant: email,
    email,
    motDePasse: "",
    agentId: c.personneId ? str(c.personneId) : "",
    personneId: c.personneId ? str(c.personneId) : undefined,
    role: roleFromApi(c.role),
    actif: (c.isActive as boolean) ?? true,
    isActive: (c.isActive as boolean) ?? true,
    motifDesactivation: optStr(c.motifDesactivation),
    dateDesactivation: c.dateDesactivation
      ? new Date(str(c.dateDesactivation)).toISOString()
      : undefined,
    tentativesEchouees: 0,
    createdAt: c.createdAt ? new Date(str(c.createdAt)).toISOString() : new Date().toISOString(),
  };
}

export function mapConge(c: ApiRecord): Conge {
  return {
    id: str(c.id),
    agentId: str(c.personneId),
    type: str(c.type).toLowerCase() as TypeConge,
    dateDebut: str(c.dateDebut),
    dateFin: str(c.dateFin),
    dureeJours: num(c.dureeJours),
    referenceDecision: str(c.referenceDecision),
    pieceJointe: optStr(c.pieceJointe),
    auteurId: str(c.auteurId),
    createdAt: c.createdAt ? new Date(str(c.createdAt)).toISOString() : new Date().toISOString(),
  };
}

export function mapCourrier(c: ApiRecord): Courrier {
  const document = (c.document as ApiRecord | null) ?? null;
  return {
    id: str(c.id),
    reference: str(c.reference),
    type: courrierTypeFromApi(c.type),
    date: str(c.date),
    objet: str(c.objet),
    expediteur: str(c.expediteur),
    destinataire: str(c.destinataire),
    agentId: c.personneId ? str(c.personneId) : undefined,
    service: optStr(c.service),
    resume: str(c.resume),
    pieceJointe: document ? str(document.nomFichier ?? document.titre) || undefined : undefined,
    createdAt: c.createdAt ? new Date(str(c.createdAt)).toISOString() : new Date().toISOString(),
    auteurId: str(c.auteurId),
  };
}

export function mapAvancement(a: ApiRecord): Avancement {
  return {
    id: str(a.id),
    agentId: str(a.personneId),
    personneId: str(a.personneId),
    ancCategorie: a.ancCategorie as Avancement["ancCategorie"],
    ancClasse: a.ancClasse as Avancement["ancClasse"],
    ancEchelon: num(a.ancEchelon),
    ancFonction: str(a.ancFonction),
    nvCategorie: a.nvCategorie as Avancement["nvCategorie"],
    nvClasse: a.nvClasse as Avancement["nvClasse"],
    nvEchelon: num(a.nvEchelon),
    nvFonction: str(a.nvFonction),
    dateEffet: str(a.dateEffet),
    nature: a.nature as Avancement["nature"],
    mode: a.mode as Avancement["mode"],
    justification: optStr(a.justification),
    pieceJustificativeId: a.pieceJustificativeId ? str(a.pieceJustificativeId) : undefined,
    modificateurId: a.modificateurId ? str(a.modificateurId) : undefined,
    auteurId: a.modificateurId ? str(a.modificateurId) : undefined,
    ancienneCategorie: a.ancCategorie as Avancement["ancCategorie"],
    nouvelleCategorie: a.nvCategorie as Avancement["nvCategorie"],
    ancienneClasse: a.ancClasse as Avancement["ancClasse"],
    nouvelleClasse: a.nvClasse as Avancement["nvClasse"],
    ancienEchelon: num(a.ancEchelon),
    nouvelEchelon: num(a.nvEchelon),
  };
}

export function mapDocument(d: ApiRecord): DocumentDossier {
  const personnes = (d.personnes as ApiRecord[] | undefined) ?? [];
  const typeDoc = (d.typeDoc as ApiRecord | undefined) ?? undefined;
  const personneIds: number[] = personnes.map((p) => {
    const personne = (p.personne as ApiRecord | undefined) ?? p;
    return Number(p.personneId ?? personne.id);
  });
  return {
    id: str(d.id),
    agentId: personneIds.length > 0 ? str(personneIds[0]) : "",
    personneId: personneIds.length > 0 ? str(personneIds[0]) : undefined,
    type: typeDocTypeFromLabel(str(typeDoc?.libelle ?? "")),
    titre: str(d.titre),
    description: optStr(d.description),
    numeroOrdre: optStr(d.numeroOrdre),
    reference: optStr(d.reference),
    expediteur: optStr(d.expediteur),
    dateDocument: optStr(d.dateDocument),
    dateAjout: optStr(d.dateAjout),
    archive: false,
    createdAt: d.dateAjout
      ? new Date(str(d.dateAjout)).toISOString()
      : new Date().toISOString(),
    versions: [
      {
        id: `${str(d.id)}`,
        version: 1,
        nomFichier: str(d.nomFichier ?? d.titre),
        tailleKo: d.tailleOctets ? Math.max(1, Math.round(num(d.tailleOctets) / 1024)) : 0,
        mime: str(d.mimeType ?? "application/octet-stream"),
        uploadedAt: d.dateAjout
          ? new Date(str(d.dateAjout)).toISOString()
          : new Date().toISOString(),
        auteurId: d.ajouteParId ? str(d.ajouteParId) : "",
      },
    ],
  };
}

export function mapAudit(e: ApiRecord): EntreeAudit {
  const auteur = (e.auteur as ApiRecord | undefined) ?? undefined;
  return {
    id: str(e.id),
    date: e.date ? new Date(str(e.date)).toISOString() : new Date().toISOString(),
    auteurId: e.auteurId ? str(e.auteurId) : undefined,
    identifiant: optStr(e.identifiant ?? auteur?.email),
    action: str(e.action),
    cible: str(e.cible),
    details: str(e.details),
    justification: optStr(e.justification),
  };
}

export function mapTitularisation(t: ApiRecord): Titularisation {
  return {
    id: str(t.id),
    dateExamen: str(t.dateExamen),
    resultat: t.resultat as Titularisation["resultat"],
    dateEffet: str(t.dateEffet),
    referenceDecision: str(t.referenceDecision),
    personneId: str(t.personneId),
  };
}
