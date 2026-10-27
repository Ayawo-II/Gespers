"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiFetch,
  apiUpload,
  errorMessage,
} from "@/services/api";
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
import {
  agentToApiPayload,
  congeTypeToApi,
  courrierTypeToApi,
  mapAffectations,
  mapAgent,
  mapAudit,
  mapAvancement,
  mapCompte,
  mapConge,
  mapCourrier,
  mapDocument,
  motifDepartToApi,
  roleFromApi,
  roleToApi,
  typeDocIdForType,
} from "@/lib/mappers";

type ApiRecord = Record<string, unknown>;

type SessionUser = {
  id: number;
  email: string;
  role: Role;
  personneId: number | null;
  mustChangePassword: boolean;
  delegatedPermissions: string[];
};

type AuditFilters = {
  page?: number;
  limit?: number;
  action?: string;
  q?: string;
  dateDebut?: string;
  dateFin?: string;
};

type ApiMeResponse = { data: SessionUser };

type Result = { ok: true } | { ok: false; error: string };

type SaveDocumentResult =
  | { ok: true; documentId?: string }
  | { ok: false; error: string };

type TypeDocOption = { id: number; libelle: string };

type StoreContextValue = {
  ready: boolean;
  state: AppState;
  session: SessionUser | null;
  currentCompte: Compte | null;
  currentAgent: Agent | null;
  typeDocs: TypeDocOption[];
  login: (identifiant: string, motDePasse: string) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Result>;
  resetData: () => void;
  audit: (entry: Omit<EntreeAudit, "id" | "date">) => void;
  loadAudit: (filters?: AuditFilters) => Promise<
    { ok: true; rows: EntreeAudit[]; total: number } | { ok: false; error: string }
  >;
  saveAgent: (
    agent: Agent,
    isNew: boolean,
    role?: Role,
  ) => Promise<{ ok: true; temporaryPassword?: string } | { ok: false; error: string }>;
  updateAgentPhoto: (agentId: string, photo: string | null) => Promise<Result>;
  updateMyPhoto: (photo: string | null) => Promise<Result>;
  saveDivision: (division: Division, isNew: boolean) => Promise<Result>;
  saveSection: (section: Section, isNew: boolean) => Promise<Result>;
  titulariser: (agentId: string, data: NonNullable<Agent["examenTitularisation"]>) => Promise<Result>;
  cloreParcours: (agentId: string, data: NonNullable<Agent["finParcours"]>) => Promise<Result>;
  enregistrerAvancement: (
    payload: Partial<Omit<Avancement, "id" | "createdAt" | "auteurId">> & Pick<Avancement, "agentId" | "dateEffet" | "nature">,
  ) => Promise<Result>;
  updateGrille: (grille: AppState["grille"]) => Promise<Result>;
  saveDocument: (doc: DocumentDossier, file?: File) => Promise<SaveDocumentResult>;
  saveCourrier: (courrier: Courrier, isNew: boolean) => Promise<Result>;
  saveConge: (conge: Conge) => Promise<Result>;
  saveCompte: (compte: Compte, isNew: boolean) => Promise<{ ok: true; temporaryPassword?: string } | { ok: false; error: string }>;
  setCompteActif: (compteId: string, actif: boolean, motif?: string) => Promise<Result>;
  resetPassword: (compteId: string) => Promise<{ ok: true; password: string } | { ok: false; error: string }>;
  changeRole: (compteId: string, role: Role) => Promise<Result>;
  setComptePermissions: (compteId: string, permissions: string[]) => Promise<Result>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const emptyState: AppState = {
  divisions: [],
  sections: [],
  agents: [],
  affectations: [],
  avancements: [],
  documents: [],
  courriers: [],
  conges: [],
  comptes: [],
  audit: [],
  grille: {
    categories: ["A1", "A2", "A3", "B", "C", "D"],
    classes: ["CLASSE_3", "CLASSE_2", "CLASSE_1", "CLASSE_PRINCIPALE", "EXCEPTIONNELLE"],
    echelons: ["1", "2", "3", "4", "5", "6"],
    dureeEchelonMois: 24,
    dureeClasseMois: 36,
  },
};

function toStringId(id: unknown): string {
  if (id === null || id === undefined) return "";
  return String(id);
}

function numFrom(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function ApiStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(emptyState);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [typeDocs, setTypeDocs] = useState<TypeDocOption[]>([]);

  const loadSession = useCallback(async () => {
    try {
      const res = await apiFetch<ApiMeResponse>("/api/v1/auth/me");
      const user = {
        ...res.data,
        delegatedPermissions: res.data.delegatedPermissions ?? [],
      };
      setSession(user);
      return user;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  const loadAvancementsFor = useCallback(async (agents: Agent[]) => {
    const results = await Promise.allSettled(
      agents.map((a) => apiFetch<{ data: ApiRecord[] }>(`/api/v1/agents/${a.id}/avancements`)),
    );
    const avancements: Avancement[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        avancements.push(...r.value.data.map(mapAvancement));
      }
    });
    return avancements;
  }, []);

  const loadTypesDocs = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: TypeDocOption[] }>("/api/v1/documents/types");
      setTypeDocs(res.data);
      return res.data;
    } catch {
      return [] as TypeDocOption[];
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    const [divisionsRes, sectionsRes, agentsRes, grilleRes, congesRes, courriersRes, comptesRes, documentsRes, auditRes] =
      await Promise.allSettled([
        apiFetch<{ data: ApiRecord[] }>("/api/v1/divisions"),
        apiFetch<{ data: ApiRecord[] }>("/api/v1/sections"),
        apiFetch<{ data: ApiRecord[] }>("/api/v1/agents?limit=100"),
        apiFetch<{ data: ApiRecord }>("/api/v1/grilles/avancement"),
        apiFetch<{ data: ApiRecord[] }>("/api/v1/conges?limit=100"),
        apiFetch<{ data: ApiRecord[] }>("/api/v1/courriers?limit=100"),
        apiFetch<{ data: ApiRecord[] }>("/api/v1/comptes"),
        apiFetch<{ data: ApiRecord[] }>("/api/v1/documents?limit=100"),
        apiFetch<{ data: ApiRecord[] }>("/api/v1/audit?limit=100"),
      ]);

    const next: AppState = { ...emptyState };

    if (divisionsRes.status === "fulfilled") {
      next.divisions = divisionsRes.value.data.map((d) => {
        const chef = (d.chef as ApiRecord | undefined) ?? undefined;
        return {
          id: toStringId(d.id),
          libelle: String(d.libelle ?? ""),
          chefId: d.chefId ? toStringId(d.chefId) : chef?.id ? toStringId(chef.id) : undefined,
        };
      });
    }
    if (sectionsRes.status === "fulfilled") {
      next.sections = sectionsRes.value.data.map((s) => {
        const division = (s.division as ApiRecord | undefined) ?? undefined;
        const chef = (s.chef as ApiRecord | undefined) ?? undefined;
        return {
          id: toStringId(s.id),
          libelle: String(s.libelle ?? ""),
          divisionId: toStringId(s.divisionId ?? division?.id),
          chefId: s.chefId ? toStringId(s.chefId) : chef?.id ? toStringId(chef.id) : undefined,
        };
      });
    }
    const rawAgents: ApiRecord[] =
      agentsRes.status === "fulfilled" ? agentsRes.value.data : [];
    const agents: Agent[] = rawAgents.map(mapAgent);
    next.agents = agents;
    next.affectations = rawAgents.flatMap((agent) =>
      mapAffectations(agent, next.sections, next.divisions),
    );
    if (grilleRes.status === "fulfilled") {
      const g = grilleRes.value.data;
      if (g) {
        next.grille = {
          categories: (g.categories as string[]) || next.grille.categories,
          classes: (g.classes as AppState["grille"]["classes"]) || next.grille.classes,
          echelons: (g.echelons as string[]) || next.grille.echelons,
          dureeEchelonMois: numFrom(g.dureeEchelonMois, next.grille.dureeEchelonMois),
          dureeClasseMois: numFrom(g.dureeClasseMois, next.grille.dureeClasseMois),
        };
      }
    }
    if (congesRes.status === "fulfilled") {
      next.conges = congesRes.value.data.map(mapConge);
    }
    if (courriersRes.status === "fulfilled") {
      next.courriers = courriersRes.value.data.map(mapCourrier);
    }
    if (comptesRes.status === "fulfilled") {
      next.comptes = comptesRes.value.data.map(mapCompte);
    }
    if (documentsRes.status === "fulfilled") {
      next.documents = documentsRes.value.data.map(mapDocument);
    }
    if (auditRes.status === "fulfilled") {
      next.audit = auditRes.value.data.map(mapAudit);
    }
    next.avancements = await loadAvancementsFor(agents);

    setState(next);
  }, [loadAvancementsFor]);

  const reload = useCallback(async () => {
    if (typeDocs.length === 0) {
      await loadTypesDocs();
    }
    await loadInitialData();
  }, [typeDocs, loadInitialData, loadTypesDocs]);

  useEffect(() => {
    (async () => {
      const user = await loadSession();
      if (user && !user.mustChangePassword) {
        await loadTypesDocs();
        await loadInitialData();
      }
      setReady(true);
    })();
  }, [loadSession, loadTypesDocs, loadInitialData]);

  const currentCompte = useMemo<Compte | null>(() => {
    if (!session) return null;
    return {
      id: toStringId(session.id),
      identifiant: session.email,
      email: session.email,
      motDePasse: "",
      agentId: session.personneId ? toStringId(session.personneId) : "",
      personneId: session.personneId ? toStringId(session.personneId) : undefined,
      role: roleFromApi(session.role),
      permissions: session.delegatedPermissions ?? [],
      actif: true,
      isActive: true,
      tentativesEchouees: 0,
      createdAt: new Date().toISOString(),
    };
  }, [session]);

  const currentAgent = useMemo<Agent | null>(() => {
    if (!currentCompte?.agentId) return null;
    return state.agents.find((a) => a.id === currentCompte.agentId) ?? null;
  }, [state.agents, currentCompte]);

  const login: StoreContextValue["login"] = async (identifiant, motDePasse) => {
    try {
      await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: identifiant.includes("@") ? identifiant : `${identifiant}@radiolome.tg`,
          password: motDePasse,
        }),
      });
      const user = await loadSession();
      if (user && !user.mustChangePassword) {
        await loadTypesDocs();
        await loadInitialData();
      }
      return { ok: true, role: roleFromApi(user?.role) || "AGENT" };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setSession(null);
    setState(emptyState);
  }, []);

  const changePassword: StoreContextValue["changePassword"] = async (
    currentPassword,
    newPassword,
  ) => {
    try {
      await apiFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const user = await loadSession();
      if (user && !user.mustChangePassword) {
        await loadTypesDocs();
        await loadInitialData();
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const resetData = useCallback(() => {
    /* no-op with real API */
  }, []);

  const audit = useCallback(() => {
    /* audit is server-side */
  }, []);

  const loadAudit = useCallback<StoreContextValue["loadAudit"]>(
    async (filters = {}) => {
      try {
        const params = new URLSearchParams();
        if (filters.page) params.set("page", String(filters.page));
        if (filters.limit) params.set("limit", String(filters.limit));
        if (filters.action) params.set("action", filters.action);
        if (filters.q) params.set("q", filters.q);
        if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
        if (filters.dateFin) params.set("dateFin", filters.dateFin);
        const query = params.toString();
        const res = await apiFetch<{ data: ApiRecord[]; meta: { total: number } }>(
          `/api/v1/audit${query ? `?${query}` : ""}`,
        );
        return {
          ok: true,
          rows: res.data.map(mapAudit),
          total: res.meta?.total ?? res.data.length,
        };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [],
  );

  const saveAgent: StoreContextValue["saveAgent"] = async (agent, isNew, role) => {
    try {
      if (isNew) {
        const res = await apiFetch<{ temporaryPassword?: string }>("/api/v1/agents", {
          method: "POST",
          body: JSON.stringify(agentToApiPayload(agent, true, role)),
        });
        await reload();
        return { ok: true, temporaryPassword: res.temporaryPassword };
      }
      await apiFetch(`/api/v1/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify(agentToApiPayload(agent, false)),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const updateAgentPhoto: StoreContextValue["updateAgentPhoto"] = async (agentId, photo) => {
    try {
      await apiFetch(`/api/v1/agents/${agentId}/photo`, {
        method: "PATCH",
        body: JSON.stringify({ photo }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const updateMyPhoto: StoreContextValue["updateMyPhoto"] = async (photo) => {
    try {
      await apiFetch("/api/v1/agents/me/photo", {
        method: "PATCH",
        body: JSON.stringify({ photo }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const saveDivision: StoreContextValue["saveDivision"] = async (division, isNew) => {
    try {
      if (isNew) {
        await apiFetch("/api/v1/divisions", {
          method: "POST",
          body: JSON.stringify({ libelle: division.libelle, chefId: division.chefId ? Number(division.chefId) : null }),
        });
      } else {
        await apiFetch(`/api/v1/divisions/${division.id}`, {
          method: "PATCH",
          body: JSON.stringify({ libelle: division.libelle, chefId: division.chefId ? Number(division.chefId) : null }),
        });
      }
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const saveSection: StoreContextValue["saveSection"] = async (section, isNew) => {
    try {
      if (isNew) {
        await apiFetch("/api/v1/sections", {
          method: "POST",
          body: JSON.stringify({
            libelle: section.libelle,
            divisionId: Number(section.divisionId),
            chefId: section.chefId ? Number(section.chefId) : null,
          }),
        });
      } else {
        await apiFetch(`/api/v1/sections/${section.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            libelle: section.libelle,
            divisionId: section.divisionId ? Number(section.divisionId) : undefined,
            chefId: section.chefId ? Number(section.chefId) : null,
          }),
        });
      }
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const titulariser: StoreContextValue["titulariser"] = async (agentId, data) => {
    try {
      await apiFetch(`/api/v1/agents/${agentId}/titularisation`, {
        method: "PUT",
        body: JSON.stringify({
          dateExamen: data.date,
          resultat: data.resultat,
          dateEffet: data.date,
          referenceDecision: data.reference,
        }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const cloreParcours: StoreContextValue["cloreParcours"] = async (agentId, data) => {
    try {
      await apiFetch(`/api/v1/agents/${agentId}/depart`, {
        method: "POST",
        body: JSON.stringify({
          dateDepart: data.date,
          motifDepart: motifDepartToApi(data.type),
          justification: data.motif,
        }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const enregistrerAvancement: StoreContextValue["enregistrerAvancement"] = async (payload) => {
    try {
      await apiFetch(`/api/v1/agents/${payload.agentId}/avancements`, {
        method: "POST",
        body: JSON.stringify({
          nature: payload.nature,
          dateEffet: payload.dateEffet,
          categorie: payload.nvCategorie ?? payload.nouvelleCategorie,
          classe: payload.nvClasse ?? payload.nouvelleClasse,
          echelon: payload.nvEchelon ?? payload.nouvelEchelon,
          fonction: payload.nvFonction,
          justification: payload.justification || "Avancement enregistré.",
        }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const updateGrille: StoreContextValue["updateGrille"] = async (grille) => {
    try {
      await apiFetch("/api/v1/grilles/avancement", {
        method: "PUT",
        body: JSON.stringify({
          categories: grille.categories,
          classes: grille.classes,
          echelons: grille.echelons,
          dureeEchelonMois: grille.dureeEchelonMois,
          dureeClasseMois: grille.dureeClasseMois,
        }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const saveDocument: StoreContextValue["saveDocument"] = async (doc, file) => {
    try {
      const typeDocId = typeDocIdForType(doc.type, typeDocs);
      if (!typeDocId) {
        return { ok: false, error: "Type de document introuvable côté serveur." };
      }
      if (!file) {
        return { ok: false, error: "Un fichier est obligatoire." };
      }
      const form = new FormData();
      form.set("file", file);
      form.set("titre", doc.titre);
      form.set("typeDocId", String(typeDocId));
      if (doc.description) form.set("description", doc.description);
      if (doc.numeroOrdre) form.set("numeroOrdre", doc.numeroOrdre);
      if (doc.reference) form.set("reference", doc.reference);
      if (doc.expediteur) form.set("expediteur", doc.expediteur);
      if (doc.dateDocument) form.set("dateDocument", doc.dateDocument);
      form.set("personneIds", JSON.stringify(doc.agentId ? [Number(doc.agentId)] : []));
      const created = await apiUpload<{ data: { id: number } }>("/api/v1/documents", form);
      await reload();
      return { ok: true, documentId: created.data?.id ? String(created.data.id) : undefined };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const saveCourrier: StoreContextValue["saveCourrier"] = async (courrier, isNew) => {
    try {
      const body = {
        reference: courrier.reference,
        type: courrierTypeToApi(courrier.type),
        date: courrier.date,
        objet: courrier.objet,
        expediteur: courrier.expediteur,
        destinataire: courrier.destinataire,
        personneId: courrier.agentId ? Number(courrier.agentId) : null,
        service: courrier.service || null,
        resume: courrier.resume || "",
      };
      if (isNew) {
        await apiFetch("/api/v1/courriers", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/api/v1/courriers/${courrier.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const saveConge: StoreContextValue["saveConge"] = async (conge) => {
    try {
      const body = {
        personneId: Number(conge.agentId),
        type: congeTypeToApi(conge.type),
        dateDebut: conge.dateDebut,
        dateFin: conge.dateFin,
        dureeJours: conge.dureeJours,
        referenceDecision: conge.referenceDecision,
        pieceJointe: conge.pieceJointe || null,
      };
      if (conge.id && !conge.id.startsWith("cg")) {
        await apiFetch(`/api/v1/conges/${conge.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/v1/conges", { method: "POST", body: JSON.stringify(body) });
      }
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const saveCompte: StoreContextValue["saveCompte"] = async (compte) => {
    try {
      const res = await apiFetch<{ data: ApiRecord; temporaryPassword?: string }>("/api/v1/comptes", {
        method: "POST",
        body: JSON.stringify({
          email: compte.email || compte.identifiant,
          personneId: Number(compte.agentId || compte.personneId),
          role: roleToApi(compte.role),
        }),
      });
      await reload();
      return { ok: true, temporaryPassword: res.temporaryPassword };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const setCompteActif: StoreContextValue["setCompteActif"] = async (compteId, actif, motif) => {
    try {
      await apiFetch(`/api/v1/comptes/${compteId}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: actif, motifDesactivation: actif ? undefined : motif }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const resetPassword: StoreContextValue["resetPassword"] = async (compteId) => {
    try {
      const res = await apiFetch<{ data: ApiRecord; temporaryPassword: string }>(
        `/api/v1/comptes/${compteId}/reset-password`,
        { method: "POST" },
      );
      return { ok: true, password: res.temporaryPassword };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const changeRole: StoreContextValue["changeRole"] = async (compteId, role) => {
    try {
      await apiFetch(`/api/v1/comptes/${compteId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleToApi(role) }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const setComptePermissions: StoreContextValue["setComptePermissions"] = async (
    compteId,
    permissions,
  ) => {
    try {
      await apiFetch(`/api/v1/comptes/${compteId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      });
      await reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  };

  const value: StoreContextValue = {
    ready,
    state,
    session,
    currentCompte,
    currentAgent,
    typeDocs,
    login,
    logout,
    changePassword,
    resetData,
    audit,
    loadAudit,
    saveAgent,
    updateAgentPhoto,
    updateMyPhoto,
    saveDivision,
    saveSection,
    titulariser,
    cloreParcours,
    enregistrerAvancement,
    updateGrille,
    saveDocument,
    saveCourrier,
    saveConge,
    saveCompte,
    setCompteActif,
    resetPassword,
    changeRole,
    setComptePermissions,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within ApiStoreProvider");
  return ctx;
}
