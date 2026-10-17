"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { todayIso } from "@/lib/utils";

export default function AvancementManuelPage() {
  const { state, currentCompte, enregistrerAvancement } = useStore();
  const router = useRouter();
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "avancements.write") : false;
  const [agentId, setAgentId] = useState("");
  const [dateEffet, setDateEffet] = useState(todayIso());
  const [nature, setNature] = useState<"echelon" | "classe" | "categorie">("echelon");
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [nouvelleClasse, setNouvelleClasse] = useState("");
  const [nouvelEchelon, setNouvelEchelon] = useState("");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");

  const agent = state.agents.find((a) => a.id === agentId);
  const candidats = useMemo(
    () => state.agents.filter((a) => a.situation !== "fin_parcours"),
    [state.agents],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!canWrite) {
      setError("Vous n'êtes pas habilité à enregistrer un avancement manuel.");
      return;
    }
    if (!agent) {
      setError("Choisissez un agent.");
      return;
    }
    if (!justification.trim()) {
      setError("Une justification est obligatoire pour un avancement manuel.");
      return;
    }
    enregistrerAvancement({
      agentId: agent.id,
      dateEffet,
      ancienneCategorie: agent.categorie,
      nouvelleCategorie: nouvelleCategorie || agent.categorie,
      ancienneClasse: agent.classe,
      nouvelleClasse: nouvelleClasse || agent.classe,
      ancienEchelon: agent.echelon,
      nouvelEchelon: nouvelEchelon || agent.echelon,
      type: "manuel",
      nature,
      justification,
    });
    router.push("/avancements");
  }

  return (
    <>
      <PageHeader
        title="Avancement manuel"
        subtitle="Changement exceptionnel de catégorie, classe ou échelon — justification obligatoire"
      />
      {!canWrite ? (
        <Alert type="error">Seuls les profils RH et chef du personnel peuvent saisir un avancement manuel.</Alert>
      ) : (
        <Card>
          <form className="form" onSubmit={onSubmit}>
            {error ? <Alert type="error">{error}</Alert> : null}
            <Field label="Agent">
              <select
                value={agentId}
                onChange={(e) => {
                  const next = state.agents.find((a) => a.id === e.target.value);
                  setAgentId(e.target.value);
                  setNouvelleCategorie(next?.categorie ?? "");
                  setNouvelleClasse(next?.classe ?? "");
                  setNouvelEchelon(next?.echelon ?? "");
                }}
                required
              >
                <option value="">Choisir…</option>
                {candidats.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.prenoms} {a.nom} — {a.categorie}
                    {a.classe}.{a.echelon}
                  </option>
                ))}
              </select>
            </Field>
            {agent ? (
              <Alert type="warn">
                Situation actuelle : {agent.categorie}
                {agent.classe}.{agent.echelon} · {agent.poste}
              </Alert>
            ) : null}
            <div className="form-row">
              <Field label="Date d'effet">
                <input type="date" value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} required />
              </Field>
              <Field label="Nature">
                <select value={nature} onChange={(e) => setNature(e.target.value as typeof nature)}>
                  <option value="echelon">Échelon</option>
                  <option value="classe">Classe</option>
                  <option value="categorie">Catégorie</option>
                </select>
              </Field>
            </div>
            <div className="form-row-3">
              <Field label="Nouvelle catégorie">
                <select value={nouvelleCategorie} onChange={(e) => setNouvelleCategorie(e.target.value)}>
                  {state.grille.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nouvelle classe">
                <select value={nouvelleClasse} onChange={(e) => setNouvelleClasse(e.target.value)}>
                  {state.grille.classes.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nouvel échelon">
                <select value={nouvelEchelon} onChange={(e) => setNouvelEchelon(e.target.value)}>
                  {state.grille.echelons.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Justification" hint="Motif, référence d'acte ou décision d'autorité.">
              <textarea value={justification} onChange={(e) => setJustification(e.target.value)} required />
            </Field>
            <Button type="submit">Enregistrer l'avancement</Button>
          </form>
        </Card>
      )}
    </>
  );
}
