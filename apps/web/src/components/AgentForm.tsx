"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import {
  CATEGORIE_LABELS,
  CLASSE_LABELS,
  SERVICES,
  type Agent,
  type Categorie,
  type Classe,
  type EtatCarriere,
  type TypeAgent,
} from "@/lib/types";
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
});

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
        <Field label="Matricule">
          <input value={agent.matricule} onChange={(e) => set("matricule", e.target.value)} required />
        </Field>
        <Field label="Nom">
          <input value={agent.nom} onChange={(e) => set("nom", e.target.value)} required />
        </Field>
        <Field label="Prénoms">
          <input value={agent.prenoms} onChange={(e) => set("prenoms", e.target.value)} required />
        </Field>
      </div>

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
            onChange={(e) => set("typeAgent", e.target.value as TypeAgent)}
          >
            <option value="FONCTIONNAIRE">Fonctionnaire</option>
            <option value="CONTRACTUEL">Contractuel</option>
            <option value="PIVOTE">Pigiste (Pivoté)</option>
          </select>
        </Field>
        <Field label="État de carrière (etatCarriere)">
          <select
            value={agent.etatCarriere}
            onChange={(e) => set("etatCarriere", e.target.value as EtatCarriere)}
            disabled={isNew}
          >
            <option value="STAGIAIRE">Stagiaire</option>
            <option value="TITULAIRE">Titulaire</option>
            <option value="SORTI">Fin de parcours (Sorti)</option>
          </select>
        </Field>
        <Field label="Date d'entrée en service">
          <input type="date" value={agent.dateEntree} onChange={(e) => set("dateEntree", e.target.value)} required />
        </Field>
      </div>

      <p className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Grade (catégorie, classe, échelon, indice)</p>
      <div className="form-row-4">
        <Field label="Catégorie">
          <select value={agent.categorie} onChange={(e) => set("categorie", e.target.value as Categorie)}>
            {state.grille.categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORIE_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Classe">
          <select value={agent.classe} onChange={(e) => set("classe", e.target.value as Classe)}>
            {state.grille.classes.map((c) => (
              <option key={c} value={c}>
                {CLASSE_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Échelon">
          <select value={String(agent.echelon)} onChange={(e) => set("echelon", Number(e.target.value))}>
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
          />
        </Field>
      </div>

      <p className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Affectation</p>
      <div className="form-row-3">
        <Field label="Service / Division">
          <select value={agent.service} onChange={(e) => set("service", e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s}>{s}</option>
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
        <Field label="Chef hiérarchique">
          <select
            value={agent.chefId ?? ""}
            onChange={(e) => set("chefId", e.target.value || undefined)}
          >
            <option value="">Aucun</option>
            {state.agents
              .filter((a) => a.id !== agent.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.prenoms} {a.nom} — {a.fonction || a.poste}
                </option>
              ))}
          </select>
        </Field>
      </div>

      <div className="actions" style={{ marginTop: 20 }}>
        <Button type="submit">{isNew ? "Enregistrer l'agent" : "Enregistrer les modifications"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
