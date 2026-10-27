// --- Enums issus directement du schéma Prisma ---

export type Role =
  | "AGENT"
  | "CHEF_SECTION"
  | "CHEF_DIVISION"
  | "RESPONSABLE_RH"
  | "CHEF_PERSONNEL"
  | "DG"
  // Aliases minuscules pour rétro-compatibilité
  | "agent"
  | "chef"
  | "rh"
  | "chef_personnel"
  | "dg";

export type Sexe = "M" | "F";

export type Categorie = "D" | "C" | "B" | "A3" | "A2" | "A1" | "A";

export type Classe =
  | "CLASSE_3"
  | "CLASSE_2"
  | "CLASSE_1"
  | "CLASSE_PRINCIPALE"
  | "EXCEPTIONNELLE"
  | "1"
  | "2"
  | "3"
  | "4";

export type TypeAgent = "FONCTIONNAIRE" | "CONTRACTUEL" | "PIGISTE";

export type EtatCarriere =
  | "STAGIAIRE"
  | "TITULAIRE"
  | "SORTI"
  // Aliases minuscules
  | "stagiaire"
  | "titulaire"
  | "fin_parcours";

export type NatureModif =
  | "ECHELON"
  | "CLASSE"
  | "CATEGORIE"
  | "echelon"
  | "classe"
  | "categorie";

export type ModeModif =
  | "AUTOMATIQUE"
  | "MANUEL"
  | "automatique"
  | "manuel";

export type ResultatExamen =
  | "ADMIS"
  | "AJOURNE"
  | "admis"
  | "ajourne";

export type MotifDepart =
  | "RETRAITE"
  | "DEMISSION"
  | "REVOCATION"
  | "DECES"
  | "AUTRE"
  | "retraite"
  | "demission"
  | "revocation"
  | "deces"
  | "fin_contrat";

// Types d'alias existants pour la compatibilité IHM
export type StatutAgent = TypeAgent;
export type SituationService = EtatCarriere;
export type FinParcoursType = MotifDepart;
export type TypeAvancement = ModeModif;

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
  | "courrier_simple"
  | "arrete_ministeriel";

// --- Interfaces d'entités correspondant aux modèles Prisma ---

export interface ExamenTitularisation {
  date: string;
  resultat: ResultatExamen;
  reference: string;
}

export interface FinParcours {
  type: FinParcoursType;
  date: string;
  motif: string;
  reference?: string;
}

/** Modèle Personnes (Prisma) + extensions IHM */
export interface Personnes {
  id: string;
  nom: string;
  prenoms: string;
  dateNaissance: string;
  lieuNaissance: string;
  sexe: Sexe;
  nbreEnfant: number;
  nomPersonnePrevenir: string;
  contactPersonnePrevenir: string;
  telephone: string;
  adresse: string;
  diplome: string;
  fonction: string; // ex: Intitulé du poste
  matricule: string;
  categorie: Categorie;
  classe: Classe;
  echelon: string | number;
  indice: number;
  typeAgent: TypeAgent;
  etatCarriere: EtatCarriere;
  dateEntree: string;
  dateDebutStage?: string | null;
  dateFinStagePrevue?: string | null;
  dateFinContrat?: string | null;
  dureeContratMois?: number | null;
  dateDernierAvancement?: string | null;
  dateDepart?: string | null;
  motifDepart?: MotifDepart | null;
  estArchive?: boolean;
  membreAral?: boolean;
  photo?: string;

  // Champs d'aide et d'association pour l'IHM
  email?: string;
  chefId?: string;
  sectionId?: string;
  divisionId?: string;
  service?: string;
  poste?: string; // alias de fonction
  statut?: StatutAgent; // alias de typeAgent
  situation?: SituationService; // alias de etatCarriere
  nombreEnfants?: number; // alias de nbreEnfant
  nationalite?: string;
  situationMatrimoniale?: string;
  formation?: string;
  dateTitularisation?: string;
  examenTitularisation?: ExamenTitularisation;
  finParcours?: FinParcours;
}

export type Agent = Personnes;

export interface Division {
  id: string;
  libelle: string;
  chefId?: string;
}

export interface Section {
  id: string;
  libelle: string;
  divisionId: string;
  chefId?: string;
}

export interface Affectation {
  id: string;
  agentId: string;
  personneId?: string;
  sectionId?: string;
  service?: string;
  poste?: string;
  dateDebut?: string;
  dateFin?: string;
  auteurId?: string;
}

/** Modèle Mods (Prisma) - Avancements et modifications de carrière */
export interface Mods {
  id: string;
  agentId: string;
  personneId?: string;
  ancCategorie: Categorie;
  ancClasse: Classe;
  ancEchelon: string | number;
  ancFonction: string;
  nvCategorie: Categorie;
  nvClasse: Classe;
  nvEchelon: string | number;
  nvFonction: string;
  dateEffet: string;
  nature: NatureModif;
  mode: ModeModif;
  justification?: string;
  pieceJustificativeId?: string;
  modificateurId?: string;
  auteurId?: string;
  createdAt?: string;

  // Aliases IHM
  type?: TypeAvancement;
  ancienneCategorie?: Categorie;
  nouvelleCategorie?: Categorie;
  ancienneClasse?: Classe;
  nouvelleClasse?: Classe;
  ancienEchelon?: string | number;
  nouvelEchelon?: string | number;
}

export type Avancement = Mods;

export interface Titularisation {
  id: string;
  dateExamen: string;
  resultat: ResultatExamen;
  dateEffet: string;
  referenceDecision: string;
  personneId: string;
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
  personneId?: string;
  type: TypeDocument;
  titre: string;
  description?: string;
  numeroOrdre?: string;
  reference?: string;
  expediteur?: string;
  dateDocument?: string;
  dateAjout?: string;
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

export interface Utilisateur {
  id: string;
  identifiant: string;
  email?: string;
  passwordHash?: string;
  motDePasse: string;
  agentId: string;
  personneId?: string;
  role: Role;
  permissions?: string[];
  isActive?: boolean;
  actif: boolean;
  motifDesactivation?: string;
  dateDesactivation?: string;
  tentativesEchouees: number;
  verrouilleJusqua?: string;
  createdAt: string;
}

export type Compte = Utilisateur;

export interface EntreeAudit {
  id: string;
  date: string;
  auteurId?: string;
  identifiant?: string;
  auteurNom?: string;
  action: string;
  cible: string;
  cibleNom?: string;
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
  divisions: Division[];
  sections: Section[];
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

// --- Mappings de libellés pour l'affichage IHM ---

export const ROLE_LABELS: Record<string, string> = {
  AGENT: "Agent (membre)",
  CHEF_SECTION: "Chef de section",
  CHEF_DIVISION: "Chef de division",
  RESPONSABLE_RH: "Responsable RH",
  CHEF_PERSONNEL: "Chef du personnel",
  DG: "Directeur général",
  // Aliases minuscules
  agent: "Agent (membre)",
  chef: "Chef de section / division",
  rh: "Responsable RH",
  chef_personnel: "Chef du personnel",
  dg: "Directeur général",
};

export const ROLE_OPTIONS: Role[] = [
  "AGENT",
  "CHEF_SECTION",
  "CHEF_DIVISION",
  "RESPONSABLE_RH",
  "CHEF_PERSONNEL",
  "DG",
];

export const TYPE_AGENT_LABELS: Record<string, string> = {
  FONCTIONNAIRE: "Fonctionnaire",
  CONTRACTUEL: "Contractuel",
  PIGISTE: "Pigiste (Pivoté)",
  PIVOTE: "Pigiste (Pivoté)",
  fonctionnaire: "Fonctionnaire",
  contractuel: "Contractuel",
  pigiste: "Pigiste",
};

export const STATUT_LABELS = TYPE_AGENT_LABELS;

export const ETAT_CARRIERE_LABELS: Record<string, string> = {
  STAGIAIRE: "Stagiaire",
  TITULAIRE: "Titulaire",
  SORTI: "Fin de parcours (Sorti)",
  stagiaire: "Stagiaire",
  titulaire: "Titulaire",
  fin_parcours: "Fin de parcours",
};

export const SITUATION_LABELS = ETAT_CARRIERE_LABELS;

export const CATEGORIE_LABELS: Record<string, string> = {
  A1: "Catégorie A1",
  A2: "Catégorie A2",
  A3: "Catégorie A3",
  B: "Catégorie B",
  C: "Catégorie C",
  D: "Catégorie D",
  A: "Catégorie A",
};

export const CLASSE_LABELS: Record<string, string> = {
  CLASSE_3: "3ème Classe",
  CLASSE_2: "2ème Classe",
  CLASSE_1: "1ère Classe",
  CLASSE_PRINCIPALE: "Classe Principale",
  EXCEPTIONNELLE: "Classe Exceptionnelle",
  "1": "Classe 1",
  "2": "Classe 2",
  "3": "Classe 3",
  "4": "Classe 4",
};

export const MOTIF_DEPART_LABELS: Record<string, string> = {
  RETRAITE: "Retraite",
  DEMISSION: "Démission",
  REVOCATION: "Révocation",
  DECES: "Décès",
  AUTRE: "Autre motif",
  retraite: "Retraite",
  demission: "Démission",
  revocation: "Révocation",
  deces: "Décès",
  fin_contrat: "Fin de contrat",
};

export const FIN_LABELS = MOTIF_DEPART_LABELS;

export const RESULTAT_EXAMEN_LABELS: Record<string, string> = {
  ADMIS: "Admis",
  AJOURNE: "Ajourné",
  admis: "Admis",
  ajourne: "Ajourné",
};

export const NATURE_MODIF_LABELS: Record<string, string> = {
  ECHELON: "Échelon",
  CLASSE: "Classe",
  CATEGORIE: "Catégorie",
  echelon: "Échelon",
  classe: "Classe",
  categorie: "Catégorie",
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
  courrier_simple: "Courrier simple",
  arrete_ministeriel: "Courrier simple",
};

export const SERVICES = [
  "Division générale",
  "Division de l'information",
  "Division des programmes",
  "Division technique",
  "Division administrative et financière",
  "Service du personnel",
  "Archives et documentation",
  "Production et antenne",
] as const;
