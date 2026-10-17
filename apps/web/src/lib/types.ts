export type Role =
  | "agent"
  | "chef"
  | "rh"
  | "chef_personnel"
  | "dg";

export type StatutAgent = "fonctionnaire" | "contractuel" | "pigiste";

export type SituationService =
  | "stagiaire"
  | "titulaire"
  | "fin_parcours";

export type FinParcoursType =
  | "retraite"
  | "demission"
  | "revocation"
  | "deces"
  | "fin_contrat";

export type TypeAvancement = "automatique" | "manuel";

export type TypeDocument =
  | "piece_identite"
  | "diplome"
  | "arrete"
  | "contrat"
  | "decision"
  | "justificatif_conge"
  | "courrier"
  | "autre";

export type TypeConge =
  | "annuel"
  | "maladie"
  | "maternite"
  | "paternite"
  | "permission_exceptionnelle"
  | "sans_solde";

export type TypeCourrier =
  | "entrant"
  | "sortant"
  | "circulaire"
  | "arrete_ministeriel";

export interface ExamenTitularisation {
  date: string;
  resultat: "admis" | "ajourne";
  reference: string;
}

export interface FinParcours {
  type: FinParcoursType;
  date: string;
  motif: string;
  reference?: string;
}

export interface Agent {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: "M" | "F";
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  situationMatrimoniale: string;
  nombreEnfants: number;
  telephone: string;
  email: string;
  adresse: string;
  formation: string;
  diplome: string;
  statut: StatutAgent;
  situation: SituationService;
  categorie: string;
  classe: string;
  echelon: string;
  service: string;
  poste: string;
  chefId?: string;
  dateEntree: string;
  dateTitularisation?: string;
  examenTitularisation?: ExamenTitularisation;
  finParcours?: FinParcours;
  photo?: string;
}

export interface Affectation {
  id: string;
  agentId: string;
  service: string;
  poste: string;
  dateDebut: string;
  dateFin?: string;
  auteurId: string;
}

export interface Avancement {
  id: string;
  agentId: string;
  dateEffet: string;
  ancienneCategorie: string;
  nouvelleCategorie: string;
  ancienneClasse: string;
  nouvelleClasse: string;
  ancienEchelon: string;
  nouvelEchelon: string;
  type: TypeAvancement;
  nature: "echelon" | "classe" | "categorie";
  justification: string;
  auteurId: string;
  pieceJointeId?: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  nomFichier: string;
  tailleKo: number;
  mime: string;
  uploadedAt: string;
  auteurId: string;
}

export interface DocumentDossier {
  id: string;
  agentId: string;
  type: TypeDocument;
  titre: string;
  archive: boolean;
  versions: DocumentVersion[];
  createdAt: string;
}

export interface Courrier {
  id: string;
  reference: string;
  type: TypeCourrier;
  date: string;
  objet: string;
  expediteur: string;
  destinataire: string;
  agentId?: string;
  service?: string;
  resume: string;
  pieceJointe?: string;
  createdAt: string;
  auteurId: string;
}

export interface Conge {
  id: string;
  agentId: string;
  type: TypeConge;
  dateDebut: string;
  dateFin: string;
  dureeJours: number;
  referenceDecision: string;
  pieceJointe?: string;
  auteurId: string;
  createdAt: string;
}

export interface Compte {
  id: string;
  identifiant: string;
  motDePasse: string;
  agentId: string;
  role: Role;
  actif: boolean;
  motifDesactivation?: string;
  tentativesEchouees: number;
  verrouilleJusqua?: string;
  createdAt: string;
}

export interface EntreeAudit {
  id: string;
  date: string;
  auteurId?: string;
  identifiant?: string;
  action: string;
  cible: string;
  details: string;
  justification?: string;
}

export interface GrilleAvancement {
  categories: string[];
  classes: string[];
  echelons: string[];
  dureeEchelonMois: number;
  dureeClasseMois: number;
}

export interface AppState {
  agents: Agent[];
  affectations: Affectation[];
  avancements: Avancement[];
  documents: DocumentDossier[];
  courriers: Courrier[];
  conges: Conge[];
  comptes: Compte[];
  audit: EntreeAudit[];
  grille: GrilleAvancement;
}

export const ROLE_LABELS: Record<Role, string> = {
  agent: "Agent (membre)",
  chef: "Chef de section / division",
  rh: "Responsable RH",
  chef_personnel: "Chef du personnel",
  dg: "Directeur général",
};

export const STATUT_LABELS: Record<StatutAgent, string> = {
  fonctionnaire: "Fonctionnaire",
  contractuel: "Contractuel",
  pigiste: "Pigiste",
};

export const SITUATION_LABELS: Record<SituationService, string> = {
  stagiaire: "Stagiaire",
  titulaire: "Titulaire",
  fin_parcours: "Fin de parcours",
};

export const DOCUMENT_LABELS: Record<TypeDocument, string> = {
  piece_identite: "Pièce d'identité",
  diplome: "Diplôme",
  arrete: "Arrêté",
  contrat: "Contrat",
  decision: "Décision",
  justificatif_conge: "Justificatif de congé",
  courrier: "Courrier",
  autre: "Autre",
};

export const CONGE_LABELS: Record<TypeConge, string> = {
  annuel: "Congé annuel",
  maladie: "Congé de maladie",
  maternite: "Congé de maternité",
  paternite: "Congé de paternité",
  permission_exceptionnelle: "Permission exceptionnelle",
  sans_solde: "Congé sans solde",
};

export const COURRIER_LABELS: Record<TypeCourrier, string> = {
  entrant: "Courrier entrant",
  sortant: "Courrier sortant",
  circulaire: "Circulaire",
  arrete_ministeriel: "Arrêté ministériel",
};

export const FIN_LABELS: Record<FinParcoursType, string> = {
  retraite: "Retraite",
  demission: "Démission",
  revocation: "Révocation",
  deces: "Décès",
  fin_contrat: "Fin de contrat",
};

export const SERVICES = [
  "Direction générale",
  "Direction de l'information",
  "Direction des programmes",
  "Direction technique",
  "Direction administrative et financière",
  "Service du personnel",
  "Archives et documentation",
  "Production et antenne",
] as const;
