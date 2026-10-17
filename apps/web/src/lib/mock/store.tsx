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
  DocumentDossier,
  EntreeAudit,
  Role,
} from "@/lib/types";
import { congeOverlap, uid } from "@/lib/utils";

const STORAGE_KEY = "gespers-radiolome-v1";
const SESSION_KEY = "gespers-session-v1";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type Session = { compteId: string };

type StoreContextValue = {
  ready: boolean;
  state: AppState;
  session: Session | null;
  currentCompte: Compte | null;
  currentAgent: Agent | null;
  login: (identifiant: string, motDePasse: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  resetData: () => void;
  audit: (entry: Omit<EntreeAudit, "id" | "date">) => void;
  saveAgent: (agent: Agent, isNew: boolean) => { ok: true } | { ok: false; error: string };
  titulariser: (agentId: string, data: NonNullable<Agent["examenTitularisation"]>) => void;
  cloreParcours: (agentId: string, data: NonNullable<Agent["finParcours"]>) => void;
  enregistrerAvancement: (payload: Omit<Avancement, "id" | "createdAt" | "auteurId">) => void;
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

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(createSeed);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as AppState);
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
    const compte = state.comptes.find((c) => c.identifiant.toLowerCase() === id && c.identifiant !== "systeme");
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
    if (compte.motDePasse !== motDePasse) {
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
    return { ok: true };
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

  const saveAgent: StoreContextValue["saveAgent"] = (agent, isNew) => {
    if (!agent.matricule.trim() || !agent.nom.trim() || !agent.prenoms.trim()) {
      return { ok: false, error: "Matricule, nom et prénoms sont obligatoires." };
    }
    const duplicate = state.agents.find(
      (a) => a.matricule.toLowerCase() === agent.matricule.toLowerCase() && a.id !== agent.id,
    );
    if (duplicate) return { ok: false, error: "Ce matricule existe déjà." };
    commit((prev) => {
      const agents = isNew
        ? [...prev.agents, agent]
        : prev.agents.map((a) => (a.id === agent.id ? agent : a));
      const affectations = isNew
        ? [
            {
              id: uid("aff"),
              agentId: agent.id,
              service: agent.service,
              poste: agent.poste,
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

  const titulariser = (agentId: string, data: NonNullable<Agent["examenTitularisation"]>) => {
    commit((prev) => ({
      ...prev,
      agents: prev.agents.map((a) =>
        a.id === agentId
          ? {
              ...a,
              situation: "titulaire",
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
        a.id === agentId ? { ...a, situation: "fin_parcours", finParcours: data } : a,
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
    const rec: Avancement = {
      ...payload,
      id: uid("av"),
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
              categorie: payload.nouvelleCategorie,
              classe: payload.nouvelleClasse,
              echelon: payload.nouvelEchelon,
            }
          : a,
      ),
    }));
    audit({
      action: payload.type === "manuel" ? "avancement_manuel" : "avancement_automatique",
      cible: payload.agentId,
      details: `${payload.nature} ${payload.ancienneCategorie}${payload.ancienneClasse}.${payload.ancienEchelon} → ${payload.nouvelleCategorie}${payload.nouvelleClasse}.${payload.nouvelEchelon}`,
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

  const saveCompte: StoreContextValue["saveCompte"] = (compte, isNew) => {
    if (!compte.identifiant.trim()) return { ok: false, error: "Identifiant obligatoire." };
    const dup = state.comptes.find(
      (c) => c.identifiant.toLowerCase() === compte.identifiant.toLowerCase() && c.id !== compte.id,
    );
    if (dup) return { ok: false, error: "Cet identifiant est déjà utilisé." };
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
          ? { ...c, actif, motifDesactivation: actif ? undefined : motif }
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
        c.id === compteId ? { ...c, motDePasse: pwd, tentativesEchouees: 0, verrouilleJusqua: undefined } : c,
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
