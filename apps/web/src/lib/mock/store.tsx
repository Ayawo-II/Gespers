"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSeed, MOCK_PASSWORD } from "@/lib/mock/seed";
import type {
  Agent,
  AppState,
  Avancement,
  Compte,
  Conge,
  Courrier,
  Division,
  DocumentDossier,
  EntreeAudit,
  Role,
  Section,
} from "@/lib/types";
import { congeOverlap, uid } from "@/lib/utils";

const STORAGE_KEY = "gespers-radiolome-v2";
const SESSION_KEY = "gespers-session-v1";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Alias d'identifiants de démonstration acceptés à la connexion. */
const LOGIN_ALIASES: Record<string, string> = {
  "chef.division": "chef.tech",
  "chef.div": "chef.tech",
  "chef.section": "chef.ama",
  "chef.sec": "chef.ama",
  "agent": "agent.kodjo",
  "dg": "dg.amouzou",
};

type Session = { compteId: string };

type StoreContextValue = {
  ready: boolean;
  state: AppState;
  session: Session | null;
  currentCompte: Compte | null;
  currentAgent: Agent | null;
  login: (identifiant: string, motDePasse: string) => { ok: true; role: Role } | { ok: false; error: string };
  logout: () => void;
  resetData: () => void;
  audit: (entry: Omit<EntreeAudit, "id" | "date">) => void;
  saveAgent: (agent: Agent, isNew: boolean) => { ok: true } | { ok: false; error: string };
  saveDivision: (division: Division, isNew: boolean) => { ok: true } | { ok: false; error: string };
  saveSection: (section: Section, isNew: boolean) => { ok: true } | { ok: false; error: string };
  titulariser: (agentId: string, data: NonNullable<Agent["examenTitularisation"]>) => void;
  cloreParcours: (agentId: string, data: NonNullable<Agent["finParcours"]>) => void;
  enregistrerAvancement: (
    payload: Partial<Omit<Avancement, "id" | "createdAt" | "auteurId">> & Pick<Avancement, "agentId" | "dateEffet" | "nature">,
  ) => void;
  updateGrille: (grille: AppState["grille"]) => void;
  saveDocument: (doc: DocumentDossier) => void;
  archiveDocument: (docId: string, motif: string) => void;
  replaceDocumentVersion: (docId: string, version: DocumentDossier["versions"][number]) => void;
  saveCourrier: (courrier: Courrier, isNew: boolean) => { ok: true } | { ok: false; error: string };
  saveConge: (conge: Conge) => { ok: true } | { ok: false; error: string };
  saveCompte: (compte: Compte, isNew: boolean) => { ok: true } | { ok: false; error: string };
  setCompteActif: (compteId: string, actif: boolean, motif?: string) => void;
  resetPassword: (compteId: string) => string;
  changeRole: (compteId: string, role: Role) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function persist(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateServices<T extends { service?: string }>(rows: T[]): T[] {
  return rows.map((r) =>
    typeof r.service === "string" && r.service.startsWith("Direction ")
      ? { ...r, service: `Division ${r.service.slice("Direction ".length)}` }
      : r,
  );
}

function migrateDivisionLabels<T extends { libelle?: string }>(rows: T[]): T[] {
  return rows.map((r) =>
    typeof r.libelle === "string" && r.libelle.startsWith("Direction ")
      ? { ...r, libelle: `Division ${r.libelle.slice("Direction ".length)}` }
      : r,
  );
}

/**
 * Réconcilie les données persistées avec le jeu de démonstration : les lignes
 * sauvegardées sont conservées (elles priment), les lignes du seed absentes
 * de la sauvegarde sont réinjectées, et les champs ajoutés par le seed
 * complètent les lignes existantes. Évite qu'un ancien cache local masque un
 * compte de démonstration ou un agent nouvellement ajouté.
 */
function reconcile<T extends { id: string }>(seed: T[], stored: T[] | undefined): T[] {
  if (!stored) return seed;
  const storedById = new Map(stored.map((r) => [r.id, r]));
  const restored = seed
    .filter((r) => !storedById.has(r.id))
    .map((r) => ({ ...r }));
  const merged = stored.map((r) => {
    const seedRow = seed.find((s) => s.id === r.id);
    return seedRow ? { ...seedRow, ...r } : r;
  });
  return [...merged, ...restored];
}

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(createSeed);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        if (parsed.agents) parsed.agents = migrateServices(parsed.agents);
        if (parsed.affectations) parsed.affectations = migrateServices(parsed.affectations);
        if (parsed.courriers) parsed.courriers = migrateServices(parsed.courriers);
        if (parsed.divisions) parsed.divisions = migrateDivisionLabels(parsed.divisions);
        const seed = createSeed();
        setState({
          ...seed,
          ...parsed,
          divisions: reconcile(seed.divisions, parsed.divisions),
          sections: reconcile(seed.sections, parsed.sections),
          agents: reconcile(seed.agents, parsed.agents),
          affectations: reconcile(seed.affectations, parsed.affectations),
          avancements: reconcile(seed.avancements, parsed.avancements),
          documents: reconcile(seed.documents, parsed.documents),
          courriers: reconcile(seed.courriers, parsed.courriers),
          conges: reconcile(seed.conges, parsed.conges),
          comptes: reconcile(seed.comptes, parsed.comptes),
        });
      }
      const sess = localStorage.getItem(SESSION_KEY);
      if (sess) setSession(JSON.parse(sess) as Session);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const commit = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const currentCompte = useMemo(
    () => state.comptes.find((c) => c.id === session?.compteId) ?? null,
    [state.comptes, session],
  );
  const currentAgent = useMemo(
    () => state.agents.find((a) => a.id === currentCompte?.agentId) ?? null,
    [state.agents, currentCompte],
  );

  const audit = useCallback(
    (entry: Omit<EntreeAudit, "id" | "date">) => {
      commit((prev) => ({
        ...prev,
        audit: [
          {
            ...entry,
            id: uid("au"),
            date: new Date().toISOString(),
          },
          ...prev.audit,
        ],
      }));
    },
    [commit],
  );

  const login: StoreContextValue["login"] = (identifiant, motDePasse) => {
    const id = identifiant.trim().toLowerCase();
    const cible = LOGIN_ALIASES[id] ?? id;
    const compte = state.comptes.find(
      (c) =>
        c.identifiant !== "systeme" &&
        (c.identifiant.toLowerCase() === cible || (c.email ?? "").toLowerCase() === id),
    );
    if (!compte) {
      audit({ action: "connexion_echouee", cible: identifiant, details: "Identifiant inconnu", identifiant });
      return { ok: false, error: "Identifiant ou mot de passe incorrect." };
    }
    if (compte.verrouilleJusqua && new Date(compte.verrouilleJusqua) > new Date()) {
      return {
        ok: false,
        error: `Compte verrouillé jusqu'à ${new Date(compte.verrouilleJusqua).toLocaleString("fr-TG")}.`,
      };
    }
    if (!compte.actif) {
      return { ok: false, error: "Ce compte est désactivé. Contactez le chef du personnel." };
    }
    if (compte.motDePasse !== motDePasse && compte.passwordHash !== motDePasse) {
      const tentatives = compte.tentativesEchouees + 1;
      const verrouille =
        tentatives >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : undefined;
      commit((prev) => ({
        ...prev,
        comptes: prev.comptes.map((c) =>
          c.id === compte.id
            ? { ...c, tentativesEchouees: tentatives, verrouilleJusqua: verrouille }
            : c,
        ),
      }));
      audit({
        action: "connexion_echouee",
        cible: compte.id,
        details: `Tentative ${tentatives}/${MAX_LOGIN_ATTEMPTS}`,
        identifiant: compte.identifiant,
      });
      if (verrouille) {
        return {
          ok: false,
          error: `Compte verrouillé après ${MAX_LOGIN_ATTEMPTS} tentatives. Réessayez dans ${LOCK_MINUTES} minutes.`,
        };
      }
      return { ok: false, error: "Identifiant ou mot de passe incorrect." };
    }
    commit((prev) => ({
      ...prev,
      comptes: prev.comptes.map((c) =>
        c.id === compte.id ? { ...c, tentativesEchouees: 0, verrouilleJusqua: undefined } : c,
      ),
    }));
    const next = { compteId: compte.id };
    setSession(next);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    audit({
      action: "connexion",
      cible: "session",
      details: "Connexion réussie",
      auteurId: compte.id,
      identifiant: compte.identifiant,
    });
    return { ok: true, role: compte.role };
  };

  const logout = () => {
    if (currentCompte) {
      audit({
        action: "deconnexion",
        cible: "session",
        details: "Déconnexion",
        auteurId: currentCompte.id,
        identifiant: currentCompte.identifiant,
      });
    }
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const resetData = () => {
    const seed = createSeed();
    setState(seed);
    persist(seed);
  };

  const saveAgent: StoreContextValue["saveAgent"] = (agentPayload, isNew) => {
    if (!agentPayload.matricule.trim() || !agentPayload.nom.trim() || !agentPayload.prenoms.trim()) {
      return { ok: false, error: "Matricule, nom et prénoms sont obligatoires." };
    }
    const duplicate = state.agents.find(
      (a) => a.matricule.toLowerCase() === agentPayload.matricule.toLowerCase() && a.id !== agentPayload.id,
    );
    if (duplicate) return { ok: false, error: "Ce matricule existe déjà." };

    const agent: Agent = {
      ...agentPayload,
      typeAgent: agentPayload.typeAgent || (agentPayload.statut as any) || "FONCTIONNAIRE",
      statut: agentPayload.typeAgent || (agentPayload.statut as any) || "FONCTIONNAIRE",
      etatCarriere: agentPayload.etatCarriere || (agentPayload.situation as any) || "STAGIAIRE",
      situation: agentPayload.etatCarriere || (agentPayload.situation as any) || "STAGIAIRE",
      nbreEnfant: agentPayload.nbreEnfant ?? agentPayload.nombreEnfants ?? 0,
      nombreEnfants: agentPayload.nbreEnfant ?? agentPayload.nombreEnfants ?? 0,
      fonction: agentPayload.fonction || agentPayload.poste || "",
      poste: agentPayload.poste || agentPayload.fonction || "",
      nomPersonnePrevenir: agentPayload.nomPersonnePrevenir || "",
      contactPersonnePrevenir: agentPayload.contactPersonnePrevenir || "",
      indice: agentPayload.indice ?? 500,
      estArchive: agentPayload.estArchive ?? false,
    };

    commit((prev) => {
      const agents = isNew
        ? [...prev.agents, agent]
        : prev.agents.map((a) => (a.id === agent.id ? agent : a));
      const affectations = isNew
        ? [
            {
              id: uid("aff"),
              agentId: agent.id,
              personneId: agent.id,
              service: agent.service || "Division générale",
              poste: agent.poste || agent.fonction || "Agent",
              dateDebut: agent.dateEntree,
              auteurId: currentCompte?.id ?? "cpt-systeme",
            },
            ...prev.affectations,
          ]
        : prev.affectations;
      const documents = isNew
        ? [
            {
              id: uid("doc"),
              agentId: agent.id,
              personneId: agent.id,
              type: "autre" as const,
              titre: `Dossier numérique – ${agent.prenoms} ${agent.nom}`,
              archive: false,
              versions: [],
              createdAt: new Date().toISOString(),
            },
            ...prev.documents,
          ]
        : prev.documents;
      return { ...prev, agents, affectations, documents };
    });
    audit({
      action: isNew ? "creation_agent" : "modification_agent",
      cible: agent.id,
      details: `${agent.matricule} – ${agent.prenoms} ${agent.nom}`,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
    return { ok: true };
  };

  const saveDivision: StoreContextValue["saveDivision"] = (division, isNew) => {
    if (!division.libelle.trim()) {
      return { ok: false, error: "Le libellé de la division est obligatoire." };
    }
    const dup = state.divisions.find(
      (d) => d.libelle.trim().toLowerCase() === division.libelle.trim().toLowerCase() && d.id !== division.id,
    );
    if (dup) return { ok: false, error: "Une division porte déjà ce libellé." };
    commit((prev) => ({
      ...prev,
      divisions: isNew
        ? [...prev.divisions, division]
        : prev.divisions.map((d) => (d.id === division.id ? division : d)),
    }));
    audit({
      action: isNew ? "creation_division" : "modification_division",
      cible: division.id,
      details: division.libelle,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
    return { ok: true };
  };

  const saveSection: StoreContextValue["saveSection"] = (section, isNew) => {
    if (!section.libelle.trim()) {
      return { ok: false, error: "Le libellé de la section est obligatoire." };
    }
    if (!section.divisionId) {
      return { ok: false, error: "La division de rattachement est obligatoire." };
    }
    const dup = state.sections.find(
      (s) =>
        s.divisionId === section.divisionId &&
        s.libelle.trim().toLowerCase() === section.libelle.trim().toLowerCase() &&
        s.id !== section.id,
    );
    if (dup) return { ok: false, error: "Cette division comporte déjà une section de ce libellé." };
    commit((prev) => ({
      ...prev,
      sections: isNew
        ? [...prev.sections, section]
        : prev.sections.map((s) => (s.id === section.id ? section : s)),
    }));
    audit({
      action: isNew ? "creation_section" : "modification_section",
      cible: section.id,
      details: section.libelle,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
    return { ok: true };
  };

  const titulariser = (agentId: string, data: NonNullable<Agent["examenTitularisation"]>) => {
    commit((prev) => ({
      ...prev,
      agents: prev.agents.map((a) =>
        a.id === agentId
          ? {
              ...a,
              etatCarriere: "TITULAIRE",
              situation: "TITULAIRE",
              dateTitularisation: data.date,
              examenTitularisation: data,
            }
          : a,
      ),
    }));
    audit({
      action: "titularisation",
      cible: agentId,
      details: `Réf. ${data.reference} – ${data.resultat}`,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const cloreParcours = (agentId: string, data: NonNullable<Agent["finParcours"]>) => {
    commit((prev) => ({
      ...prev,
      agents: prev.agents.map((a) =>
        a.id === agentId
          ? {
              ...a,
              etatCarriere: "SORTI",
              situation: "SORTI",
              dateDepart: data.date,
              motifDepart: data.type as any,
              finParcours: data,
            }
          : a,
      ),
    }));
    audit({
      action: "fin_parcours",
      cible: agentId,
      details: `${data.type} – ${data.date}`,
      justification: data.motif,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const enregistrerAvancement: StoreContextValue["enregistrerAvancement"] = (payload) => {
    const targetAgent = state.agents.find((a) => a.id === payload.agentId);
    const rec: Avancement = {
      ...payload,
      id: uid("av"),
      personneId: payload.agentId,
      ancCategorie: payload.ancCategorie || payload.ancienneCategorie || targetAgent?.categorie || "C",
      nvCategorie: payload.nvCategorie || payload.nouvelleCategorie || targetAgent?.categorie || "C",
      ancClasse: payload.ancClasse || payload.ancienneClasse || targetAgent?.classe || "CLASSE_3",
      nvClasse: payload.nvClasse || payload.nouvelleClasse || targetAgent?.classe || "CLASSE_3",
      ancEchelon: payload.ancEchelon || payload.ancienEchelon || targetAgent?.echelon || 1,
      nvEchelon: payload.nvEchelon || payload.nouvelEchelon || targetAgent?.echelon || 1,
      ancFonction: payload.ancFonction || targetAgent?.fonction || targetAgent?.poste || "",
      nvFonction: payload.nvFonction || targetAgent?.fonction || targetAgent?.poste || "",
      mode: payload.mode || (payload.type === "manuel" ? "MANUEL" : "AUTOMATIQUE"),
      type: payload.type || "AUTOMATIQUE",
      createdAt: new Date().toISOString(),
      auteurId: currentCompte?.id ?? "cpt-systeme",
    };
    commit((prev) => ({
      ...prev,
      avancements: [rec, ...prev.avancements],
      agents: prev.agents.map((a) =>
        a.id === payload.agentId
          ? {
              ...a,
              categorie: payload.nouvelleCategorie || payload.nvCategorie || a.categorie,
              classe: payload.nouvelleClasse || payload.nvClasse || a.classe,
              echelon: payload.nouvelEchelon || payload.nvEchelon || a.echelon,
              dateDernierAvancement: payload.dateEffet,
            }
          : a,
      ),
    }));
    audit({
      action: payload.type === "manuel" || payload.mode === "MANUEL" ? "avancement_manuel" : "avancement_automatique",
      cible: payload.agentId,
      details: `${payload.nature} ${payload.ancienneCategorie || payload.ancCategorie}${payload.ancienneClasse || payload.ancClasse}.${payload.ancienEchelon || payload.ancEchelon} → ${payload.nouvelleCategorie || payload.nvCategorie}${payload.nouvelleClasse || payload.nvClasse}.${payload.nouvelEchelon || payload.nvEchelon}`,
      justification: payload.justification,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const updateGrille = (grille: AppState["grille"]) => {
    commit((prev) => ({ ...prev, grille }));
    audit({
      action: "parametrage_grille",
      cible: "grille",
      details: `Échelon ${grille.dureeEchelonMois} mois / classe ${grille.dureeClasseMois} mois`,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const saveDocument = (doc: DocumentDossier) => {
    commit((prev) => {
      const exists = prev.documents.some((d) => d.id === doc.id);
      return {
        ...prev,
        documents: exists ? prev.documents.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...prev.documents],
      };
    });
    audit({
      action: "document",
      cible: doc.agentId,
      details: doc.titre,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const archiveDocument = (docId: string, motif: string) => {
    commit((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === docId ? { ...d, archive: true } : d)),
    }));
    audit({
      action: "archivage_document",
      cible: docId,
      details: "Archivage (pas de suppression définitive)",
      justification: motif,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const replaceDocumentVersion = (docId: string, version: DocumentDossier["versions"][number]) => {
    commit((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === docId ? { ...d, versions: [...d.versions, version] } : d,
      ),
    }));
  };

  const saveCourrier: StoreContextValue["saveCourrier"] = (courrier, isNew) => {
    if (!courrier.reference.trim() || !courrier.objet.trim()) {
      return { ok: false, error: "Référence et objet sont obligatoires." };
    }
    const dup = state.courriers.find(
      (c) => c.reference.toLowerCase() === courrier.reference.toLowerCase() && c.id !== courrier.id,
    );
    if (dup) return { ok: false, error: "Cette référence de courrier existe déjà." };
    commit((prev) => ({
      ...prev,
      courriers: isNew
        ? [courrier, ...prev.courriers]
        : prev.courriers.map((c) => (c.id === courrier.id ? courrier : c)),
    }));
    audit({
      action: isNew ? "creation_courrier" : "modification_courrier",
      cible: courrier.id,
      details: courrier.reference,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
    return { ok: true };
  };

  const saveConge: StoreContextValue["saveConge"] = (conge) => {
    if (!conge.agentId || !conge.dateDebut || !conge.dateFin || !conge.referenceDecision.trim()) {
      return { ok: false, error: "Agent, dates et référence de décision sont obligatoires." };
    }
    if (conge.dateFin < conge.dateDebut) {
      return { ok: false, error: "La date de fin doit être postérieure à la date de début." };
    }
    if (congeOverlap(state.conges, conge.agentId, conge.dateDebut, conge.dateFin, conge.id).length) {
      return { ok: false, error: "Cette période chevauche un congé déjà enregistré pour l'agent." };
    }
    commit((prev) => {
      const exists = prev.conges.some((c) => c.id === conge.id);
      return {
        ...prev,
        conges: exists ? prev.conges.map((c) => (c.id === conge.id ? conge : c)) : [conge, ...prev.conges],
      };
    });
    audit({
      action: "enregistrement_conge",
      cible: conge.agentId,
      details: `${conge.type} ${conge.dateDebut} → ${conge.dateFin}`,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
    return { ok: true };
  };

  const saveCompte: StoreContextValue["saveCompte"] = (comptePayload, isNew) => {
    if (!comptePayload.identifiant.trim()) return { ok: false, error: "Identifiant obligatoire." };
    const dup = state.comptes.find(
      (c) => c.identifiant.toLowerCase() === comptePayload.identifiant.toLowerCase() && c.id !== comptePayload.id,
    );
    if (dup) return { ok: false, error: "Cet identifiant est déjà utilisé." };

    const compte: Compte = {
      ...comptePayload,
      email: comptePayload.email || `${comptePayload.identifiant}@radiolome.tg`,
      passwordHash: comptePayload.passwordHash || comptePayload.motDePasse,
      isActive: comptePayload.isActive ?? comptePayload.actif ?? true,
      actif: comptePayload.actif ?? comptePayload.isActive ?? true,
      personneId: comptePayload.personneId || comptePayload.agentId,
    };

    commit((prev) => ({
      ...prev,
      comptes: isNew
        ? [...prev.comptes, compte]
        : prev.comptes.map((c) => (c.id === compte.id ? compte : c)),
    }));
    audit({
      action: isNew ? "creation_compte" : "modification_compte",
      cible: compte.id,
      details: `${compte.identifiant} (${compte.role})`,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
    return { ok: true };
  };

  const setCompteActif = (compteId: string, actif: boolean, motif?: string) => {
    if (!actif && !motif?.trim()) return;
    commit((prev) => ({
      ...prev,
      comptes: prev.comptes.map((c) =>
        c.id === compteId
          ? {
              ...c,
              actif,
              isActive: actif,
              motifDesactivation: actif ? undefined : motif,
              dateDesactivation: actif ? undefined : new Date().toISOString(),
            }
          : c,
      ),
    }));
    audit({
      action: actif ? "reactivation_compte" : "desactivation_compte",
      cible: compteId,
      details: actif ? "Réactivation" : "Désactivation",
      justification: motif,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const resetPassword = (compteId: string) => {
    const pwd = MOCK_PASSWORD;
    commit((prev) => ({
      ...prev,
      comptes: prev.comptes.map((c) =>
        c.id === compteId
          ? {
              ...c,
              motDePasse: pwd,
              passwordHash: pwd,
              tentativesEchouees: 0,
              verrouilleJusqua: undefined,
            }
          : c,
      ),
    }));
    audit({
      action: "reset_mot_de_passe",
      cible: compteId,
      details: "Réinitialisation du mot de passe",
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
    return pwd;
  };

  const changeRole = (compteId: string, role: Role) => {
    commit((prev) => ({
      ...prev,
      comptes: prev.comptes.map((c) => (c.id === compteId ? { ...c, role } : c)),
    }));
    audit({
      action: "changement_role",
      cible: compteId,
      details: role,
      auteurId: currentCompte?.id,
      identifiant: currentCompte?.identifiant,
    });
  };

  const value: StoreContextValue = {
    ready,
    state,
    session,
    currentCompte,
    currentAgent,
    login,
    logout,
    resetData,
    audit,
    saveAgent,
    saveDivision,
    saveSection,
    titulariser,
    cloreParcours,
    enregistrerAvancement,
    updateGrille,
    saveDocument,
    archiveDocument,
    replaceDocumentVersion,
    saveCourrier,
    saveConge,
    saveCompte,
    setCompteActif,
    resetPassword,
    changeRole,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within MockStoreProvider");
  return ctx;
}
