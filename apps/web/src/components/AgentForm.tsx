"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
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
  const { state, saveAgent } = useStore();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent>(initial ?? empty(uid("ag")));
  const [error, setError] = useState("");

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
    if (!agent.sectionId) {
      setError("La section d'affectation est obligatoire.");
      return;
    }
    if (agent.email && !agent.email.includes("@")) {
      setError("Adresse e-mail invalide.");
      return;
    }
    const res = await saveAgent(
      {
        ...agent,
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
    router.push(`/agents/${agent.id}`);
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
        <Field label="E-mail">
          <input type="email" value={agent.email ?? ""} onChange={(e) => set("email", e.target.value)} />
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
      <div className="form-row-3">
        <Field label="Service / Division">
          <select
            value={agent.service}
            onChange={(e) => {
              set("service", e.target.value);
              set("sectionId", "");
            }}
          >
            {state.divisions.map((d) => (
              <option key={d.id} value={d.libelle}>
                {d.libelle}
              </option>
            ))}
            {agent.service && !state.divisions.some((d) => d.libelle === agent.service) ? (
              <option value={agent.service}>{agent.service}</option>
            ) : null}
          </select>
        </Field>
        <Field label="Section d'affectation *">
          <select
            value={agent.sectionId ?? ""}
            onChange={(e) => set("sectionId", e.target.value)}
            required
          >
            <option value="">Sélectionner une section</option>
            {(() => {
              const currentDivision = state.divisions.find((d) => d.libelle === agent.service);
              if (!currentDivision) return null;
              return state.sections
                .filter((s) => s.divisionId === currentDivision.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.libelle}
                  </option>
                ));
            })()}
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
        if (!agent.sectionId) return null;
        const section = state.sections.find((s) => String(s.id) === String(agent.sectionId));
        if (!section) return null;
        const chef = section.chefId ? state.agents.find((a) => a.id === section.chefId) : undefined;
        return (
          <p className="muted" style={{ fontSize: 12 }}>
            Chef de section : {chef ? `${chef.prenoms} ${chef.nom}` : "Non renseigné"} — deviendra le supérieur direct de l&apos;agent.
          </p>
        );
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
