"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { SERVICES, type Agent, type StatutAgent, type SituationService } from "@/lib/types";
import { uid } from "@/lib/utils";

const empty = (id: string): Agent => ({
  id,
  matricule: "",
  nom: "",
  prenoms: "",
  sexe: "M",
  dateNaissance: "",
  lieuNaissance: "Lomé",
  nationalite: "Togolaise",
  situationMatrimoniale: "Célibataire",
  nombreEnfants: 0,
  telephone: "",
  email: "",
  adresse: "",
  formation: "",
  diplome: "",
  statut: "fonctionnaire",
  situation: "stagiaire",
  categorie: "C",
  classe: "1",
  echelon: "1",
  service: "Direction de l'information",
  poste: "",
  dateEntree: new Date().toISOString().slice(0, 10),
});

export function AgentForm({ initial, isNew }: { initial?: Agent; isNew: boolean }) {
  const { state, saveAgent } = useStore();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent>(initial ?? empty(uid("ag")));
  const [error, setError] = useState("");

  function set<K extends keyof Agent>(key: K, value: Agent[K]) {
    setAgent((a) => ({ ...a, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (agent.email && !agent.email.includes("@")) {
      setError("Adresse e-mail invalide.");
      return;
    }
    const res = saveAgent(agent, isNew);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/agents/${agent.id}`);
  }

  return (
    <form className="form card" onSubmit={onSubmit}>
      {error ? <Alert type="error">{error}</Alert> : null}
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
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
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
        <Field label="Nationalité">
          <input value={agent.nationalite} onChange={(e) => set("nationalite", e.target.value)} />
        </Field>
        <Field label="Situation matrimoniale">
          <input value={agent.situationMatrimoniale} onChange={(e) => set("situationMatrimoniale", e.target.value)} />
        </Field>
        <Field label="Nombre d'enfants">
          <input
            type="number"
            min={0}
            value={agent.nombreEnfants}
            onChange={(e) => set("nombreEnfants", Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="form-row-3">
        <Field label="Téléphone">
          <input value={agent.telephone} onChange={(e) => set("telephone", e.target.value)} />
        </Field>
        <Field label="E-mail">
          <input type="email" value={agent.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Adresse">
          <input value={agent.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Formation">
          <input value={agent.formation} onChange={(e) => set("formation", e.target.value)} />
        </Field>
        <Field label="Diplôme">
          <input value={agent.diplome} onChange={(e) => set("diplome", e.target.value)} />
        </Field>
      </div>
      <div className="form-row-3">
        <Field label="Statut">
          <select value={agent.statut} onChange={(e) => set("statut", e.target.value as StatutAgent)}>
            <option value="fonctionnaire">Fonctionnaire</option>
            <option value="contractuel">Contractuel</option>
            <option value="pigiste">Pigiste</option>
          </select>
        </Field>
        <Field label="Situation de service" hint={isNew ? "L'entrée en service se fait en qualité de stagiaire." : undefined}>
          <select
            value={agent.situation}
            onChange={(e) => set("situation", e.target.value as SituationService)}
            disabled={isNew}
          >
            <option value="stagiaire">Stagiaire</option>
            <option value="titulaire">Titulaire</option>
            <option value="fin_parcours">Fin de parcours</option>
          </select>
        </Field>
        <Field label="Date d'entrée">
          <input type="date" value={agent.dateEntree} onChange={(e) => set("dateEntree", e.target.value)} required />
        </Field>
      </div>
      <div className="form-row-3">
        <Field label="Catégorie">
          <select value={agent.categorie} onChange={(e) => set("categorie", e.target.value)}>
            {state.grille.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Classe">
          <select value={agent.classe} onChange={(e) => set("classe", e.target.value)}>
            {state.grille.classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Échelon">
          <select value={agent.echelon} onChange={(e) => set("echelon", e.target.value)}>
            {state.grille.echelons.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row-3">
        <Field label="Service">
          <select value={agent.service} onChange={(e) => set("service", e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Poste">
          <input value={agent.poste} onChange={(e) => set("poste", e.target.value)} required />
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
                  {a.prenoms} {a.nom} — {a.poste}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <div className="actions">
        <Button type="submit">{isNew ? "Enregistrer l'agent" : "Enregistrer les modifications"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
