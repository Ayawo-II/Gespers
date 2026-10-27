"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import {
  CATEGORIE_LABELS,
  CLASSE_LABELS,
  type Agent,
  type Categorie,
  type Classe,
  type EtatCarriere,
  type TypeAgent,
} from "@/lib/types";
import { readPhotoFile } from "@/lib/photo";
import { uid } from "@/lib/utils";

const empty = (id: string): Agent => ({
  id,
  matricule: "",
  nom: "",
  prenoms: "",
  sexe: "M",
  dateNaissance: "",
  lieuNaissance: "Lomé",
  nbreEnfant: 0,
  nombreEnfants: 0,
  nomPersonnePrevenir: "",
  contactPersonnePrevenir: "",
  nationalite: "Togolaise",
  situationMatrimoniale: "Célibataire",
  telephone: "",
  email: "",
  adresse: "",
  formation: "",
  diplome: "",
  fonction: "",
  poste: "",
  typeAgent: "FONCTIONNAIRE",
  statut: "FONCTIONNAIRE",
  etatCarriere: "STAGIAIRE",
  situation: "STAGIAIRE",
  categorie: "C",
  classe: "CLASSE_3",
  echelon: 1,
  indice: 500,
  service: "Division de l'information",
  dateEntree: new Date().toISOString().slice(0, 10),
  estArchive: false,
  membreAral: false,
  sectionId: "",
} as Agent);

export function AgentForm({ initial, isNew }: { initial?: Agent; isNew: boolean }) {
  const { state, saveAgent, currentCompte } = useStore();
  const router = useRouter();
  const canWriteAll = currentCompte
    ? hasPermission(currentCompte.role, "agents.write")
    : false;
  const canCreateInDivision = currentCompte
    ? hasPermission(
        currentCompte.role,
        "agents.create.division",
        currentCompte.permissions,
      )
    : false;
  const delegatedDivision =
    !canWriteAll && canCreateInDivision
      ? state.divisions.find((division) => division.chefId === currentCompte?.agentId)
      : undefined;
  const availableDivisions = delegatedDivision ? [delegatedDivision] : state.divisions;

  const [agent, setAgent] = useState<Agent>(() => {
    if (initial) {
      const division = state.divisions.find((d) => d.libelle === initial.service);
      return { ...initial, divisionId: initial.divisionId ?? division?.id ?? "" };
    }
    const division = delegatedDivision ?? state.divisions[0];
    return {
      ...empty(uid("ag")),
      service: division?.libelle ?? "",
      divisionId: division?.id ?? "",
    };
  });
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedDivision =
    availableDivisions.find((division) => division.id === agent.divisionId) ??
    availableDivisions.find((division) => division.libelle === agent.service);
  const sectionsForDivision = selectedDivision
    ? state.sections.filter((section) => section.divisionId === selectedDivision.id)
    : [];

  function set<K extends keyof Agent>(key: K, value: Agent[K]) {
    setAgent((a) => {
      const next = { ...a, [key]: value };
      // Maintain synchronized aliases
      if (key === "typeAgent") next.statut = value as Agent["statut"];
      if (key === "etatCarriere") next.situation = value as Agent["situation"];
      if (key === "nbreEnfant") next.nombreEnfants = Number(value);
      if (key === "fonction") next.poste = String(value);
      if (key === "poste") next.fonction = String(value);
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (isNew && !agent.email?.trim()) {
      setError("L'adresse e-mail est obligatoire pour créer le compte de l'agent.");
      return;
    }
    if (agent.email && !agent.email.includes("@")) {
      setError("Adresse e-mail invalide.");
      return;
    }
    const section = agent.sectionId
      ? state.sections.find((item) => item.id === agent.sectionId)
      : undefined;
    const division = section
      ? state.divisions.find((item) => item.id === section.divisionId)
      : selectedDivision;
    if (!division) {
      setError("Sélectionnez une division ou une section d'affectation.");
      return;
    }
    const res = await saveAgent(
      {
        ...agent,
        divisionId: division.id,
        service: division.libelle,
        fonction: agent.fonction || agent.poste || "",
        poste: agent.poste || agent.fonction,
        statut: agent.typeAgent,
        situation: agent.etatCarriere,
        nombreEnfants: agent.nbreEnfant,
      },
      isNew,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (isNew && res.temporaryPassword && agent.email) {
      setCreatedAccount({
        email: agent.email.trim().toLowerCase(),
        password: res.temporaryPassword,
      });
      return;
    }
    router.push(`/agents/${agent.id}`);
  }

  if (createdAccount) {
    const createdAgent = state.agents.find(
      (item) => item.matricule === agent.matricule,
    );
    return (
      <div className="card">
        <h3 style={{ color: "var(--navy)", marginBottom: 10 }}>
          Agent et compte créés
        </h3>
        <Alert>
          Transmettez ces identifiants au nouvel agent. Le mot de passe temporaire
          ne sera plus affiché ensuite et devra être changé à la première connexion.
        </Alert>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <div>
            <span className="muted">Adresse e-mail : </span>
            <strong>{createdAccount.email}</strong>
          </div>
          <div>
            <span className="muted">Mot de passe temporaire : </span>
            <code
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                background: "var(--surface-2, #f1f5f9)",
                fontSize: 14,
              }}
            >
              {createdAccount.password}
            </code>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 18 }}>
          <Button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${createdAccount.email}\n${createdAccount.password}`,
                );
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Identifiants copiés" : "Copier les identifiants"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.push(createdAgent ? `/agents/${createdAgent.id}` : "/agents")
            }
          >
            Voir la fiche de l&apos;agent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="form card" onSubmit={onSubmit}>
      {error ? <Alert type="error">{error}</Alert> : null}

      <h3 style={{ color: "var(--navy)", marginBottom: 12 }}>Identité & État civil</h3>
      <div className="form-row-3">
        <Field label="Photo de profil">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                set("photo", await readPhotoFile(file));
              } catch {
                set("photo", undefined);
              }
            }}
          />
        </Field>
        <Field label="Matricule">
          <input value={agent.matricule} onChange={(e) => set("matricule", e.target.value)} required />
        </Field>
        <Field label="Nom">
          <input value={agent.nom} onChange={(e) => set("nom", e.target.value)} required />
        </Field>
      </div>
      <div className="form-row-3">
        <Field label="Prénoms">
          <input value={agent.prenoms} onChange={(e) => set("prenoms", e.target.value)} required />
        </Field>
      </div>
      {agent.photo ? (
        <div style={{ marginBottom: 12 }}>
          <img src={agent.photo} alt="Aperçu photo" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
        </div>
      ) : null}

      <div className="form-row-3">
        <Field label="Sexe">
          <select value={agent.sexe} onChange={(e) => set("sexe", e.target.value as "M" | "F")}>
            <option value="M">Masculin (M)</option>
            <option value="F">Féminin (F)</option>
          </select>
        </Field>
        <Field label="Date de naissance">
          <input type="date" value={agent.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} required />
        </Field>
        <Field label="Lieu de naissance">
          <input value={agent.lieuNaissance} onChange={(e) => set("lieuNaissance", e.target.value)} />
        </Field>
      </div>

      <div className="form-row-3">
        <Field label="Nombre d'enfants (nbreEnfant)">
          <input
            type="number"
            min={0}
            value={agent.nbreEnfant ?? agent.nombreEnfants ?? 0}
            onChange={(e) => set("nbreEnfant", Number(e.target.value))}
          />
        </Field>
        <Field label="Personne à prévenir (Nom)">
          <input
            value={agent.nomPersonnePrevenir ?? ""}
            onChange={(e) => set("nomPersonnePrevenir", e.target.value)}
            placeholder="Ex: Amouzou Afiwa"
          />
        </Field>
        <Field label="Personne à prévenir (Contact)">
          <input
            value={agent.contactPersonnePrevenir ?? ""}
            onChange={(e) => set("contactPersonnePrevenir", e.target.value)}
            placeholder="Ex: +228 90 00 00 00"
          />
        </Field>
      </div>

      <div className="form-row-3">
        <Field label="Nationalité">
          <input value={agent.nationalite ?? "Togolaise"} onChange={(e) => set("nationalite", e.target.value)} />
        </Field>
        <Field label="Situation matrimoniale">
          <input value={agent.situationMatrimoniale ?? "Célibataire"} onChange={(e) => set("situationMatrimoniale", e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <input value={agent.telephone} onChange={(e) => set("telephone", e.target.value)} />
        </Field>
      </div>

      <div className="form-row">
        <Field label={isNew ? "E-mail *" : "E-mail"}>
          <input
            type="email"
            value={agent.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            required={isNew}
            placeholder="prenom.nom@radiolome.tg"
          />
        </Field>
        <Field label="Adresse de résidence">
          <input value={agent.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </Field>
      </div>

      <h3 style={{ color: "var(--navy)", marginTop: 16, marginBottom: 12 }}>Formation & Qualifications</h3>
      <div className="form-row">
        <Field label="Formation / Filière">
          <input value={agent.formation ?? ""} onChange={(e) => set("formation", e.target.value)} />
        </Field>
        <Field label="Diplôme le plus élevé">
          <input value={agent.diplome} onChange={(e) => set("diplome", e.target.value)} />
        </Field>
      </div>

      <h3 style={{ color: "var(--navy)", marginTop: 16, marginBottom: 12 }}>Situation administrative & Carrière</h3>

      <p className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Statut & positionnement</p>
      <div className="form-row-3">
        <Field label="Type d'agent (typeAgent)">
          <select
            value={agent.typeAgent}
            onChange={(e) => {
              const v = e.target.value as TypeAgent;
              set("typeAgent", v);
              if (v !== "FONCTIONNAIRE") {
                set("etatCarriere", "TITULAIRE");
              }
            }}
          >
            <option value="FONCTIONNAIRE">Fonctionnaire</option>
            <option value="CONTRACTUEL">Contractuel</option>
            <option value="PIGISTE">Pigiste (Pivoté)</option>
          </select>
        </Field>
        <Field label="État de carrière (etatCarriere)">
          <select
            value={agent.etatCarriere}
            onChange={(e) => set("etatCarriere", e.target.value as EtatCarriere)}
            disabled={!isNew || agent.typeAgent !== "FONCTIONNAIRE"}
          >
            <option value="STAGIAIRE">Stagiaire</option>
            <option value="TITULAIRE">Titulaire</option>
            <option value="SORTI">Fin de parcours (Sorti)</option>
          </select>
        </Field>
        <Field label="Date d'entrée en service">
          <input
            type="date"
            value={agent.dateEntree}
            onChange={(e) => set("dateEntree", e.target.value)}
            disabled={!isNew}
            required
          />
        </Field>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={agent.membreAral === true}
            onChange={(e) => set("membreAral", e.target.checked)}
          />
          Membre de l&apos;amicale de la radio ARAL
        </label>
      </div>

      <p className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Grade (catégorie, classe, échelon, indice)</p>
      <div className="form-row-4">
        <Field label="Catégorie">
          <select
            value={agent.categorie}
            onChange={(e) => set("categorie", e.target.value as Categorie)}
            disabled={!isNew}
          >
            {state.grille.categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORIE_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Classe">
          <select
            value={agent.classe}
            onChange={(e) => set("classe", e.target.value as Classe)}
            disabled={!isNew}
          >
            {state.grille.classes.map((c) => (
              <option key={c} value={c}>
                {CLASSE_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Échelon">
          <select
            value={String(agent.echelon)}
            onChange={(e) => set("echelon", Number(e.target.value))}
            disabled={!isNew}
          >
            {state.grille.echelons.map((c) => (
              <option key={c} value={c}>
                Échelon {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Indice">
          <input
            type="number"
            min={0}
            value={agent.indice ?? 500}
            onChange={(e) => set("indice", Number(e.target.value))}
            disabled={!isNew}
          />
        </Field>
      </div>

      <p className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Affectation</p>
      {delegatedDivision ? (
        <Alert>
          Votre droit de création est limité à la division {delegatedDivision.libelle}.
        </Alert>
      ) : null}
      <div className="form-row-3">
        <Field label="Division d'affectation *">
          <select
            value={selectedDivision?.id ?? ""}
            onChange={(e) => {
              const division = availableDivisions.find((d) => d.id === e.target.value);
              setAgent((current) => ({
                ...current,
                divisionId: division?.id ?? "",
                service: division?.libelle ?? "",
                sectionId: "",
              }));
            }}
            required
            disabled={Boolean(delegatedDivision)}
          >
            <option value="">Sélectionner une division</option>
            {availableDivisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.libelle}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Section (optionnelle)">
          <select
            value={agent.sectionId ?? ""}
            onChange={(e) => set("sectionId", e.target.value)}
            disabled={!selectedDivision}
          >
            <option value="">Aucune section (rattachement direct)</option>
            {sectionsForDivision.map((section) => (
              <option key={section.id} value={section.id}>
                {section.libelle}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fonction / Intitulé du poste">
          <input
            value={agent.fonction || agent.poste || ""}
            onChange={(e) => {
              set("fonction", e.target.value);
              set("poste", e.target.value);
            }}
            required
          />
        </Field>
      </div>
      {(() => {
        if (agent.sectionId) {
          const section = state.sections.find((s) => String(s.id) === String(agent.sectionId));
          if (!section) return null;
          const chef = section.chefId
            ? state.agents.find((a) => a.id === section.chefId)
            : undefined;
          return (
            <p className="muted" style={{ fontSize: 12 }}>
              Chef de section : {chef ? `${chef.prenoms} ${chef.nom}` : "Non renseigné"} — deviendra le supérieur direct de l&apos;agent.
            </p>
          );
        }
        if (selectedDivision) {
          const chef = selectedDivision.chefId
            ? state.agents.find((a) => a.id === selectedDivision.chefId)
            : undefined;
          return (
            <p className="muted" style={{ fontSize: 12 }}>
              Aucune section sélectionnée : l&apos;agent sera rattaché directement à la division.
              {" "}Chef de division : {chef ? `${chef.prenoms} ${chef.nom}` : "Non renseigné"}.
            </p>
          );
        }
        return null;
      })()}

      <div className="actions" style={{ marginTop: 20 }}>
        <Button type="submit">{isNew ? "Enregistrer l'agent" : "Enregistrer les modifications"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
