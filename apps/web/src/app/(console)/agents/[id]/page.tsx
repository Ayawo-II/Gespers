"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, ButtonLink, Card, Empty, Field, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { FIN_LABELS, type FinParcoursType } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import { canSeeAgent } from "@/lib/visibility";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentCompte, currentAgent, titulariser, cloreParcours } = useStore();
  const agent = state.agents.find((a) => a.id === id);
  const [examDate, setExamDate] = useState("");
  const [examRef, setExamRef] = useState("");
  const [examRes, setExamRes] = useState<"admis" | "ajourne">("admis");
  const [finType, setFinType] = useState<FinParcoursType>("retraite");
  const [finDate, setFinDate] = useState("");
  const [finMotif, setFinMotif] = useState("");
  const [finRef, setFinRef] = useState("");
  const [msg, setMsg] = useState("");

  if (!agent || !canSeeAgent(agent, currentCompte, currentAgent)) {
    return <Empty title="Agent introuvable" hint="Ce dossier n'existe pas ou n'est pas dans votre périmètre." />;
  }

  const canWrite = currentCompte ? hasPermission(currentCompte.role, "agents.write") : false;
  const chef = state.agents.find((a) => a.id === agent.chefId);
  const compte = state.comptes.find((c) => c.agentId === agent.id && c.identifiant !== "systeme");

  function onTitulariser(e: FormEvent) {
    e.preventDefault();
    if (!examDate || !examRef) return;
    titulariser(agent!.id, { date: examDate, resultat: examRes, reference: examRef });
    setMsg("Titularisation enregistrée.");
  }

  function onFin(e: FormEvent) {
    e.preventDefault();
    if (!finDate || !finMotif) return;
    cloreParcours(agent!.id, { type: finType, date: finDate, motif: finMotif, reference: finRef || undefined });
    setMsg("Fin de parcours enregistrée.");
  }

  return (
    <>
      <PageHeader title={fullName(agent)} subtitle={`${agent.matricule} · ${agent.poste}`}>
        <ButtonLink href={`/agents/${agent.id}/carriere`} variant="secondary">
          Carrière
        </ButtonLink>
        <ButtonLink href={`/agents/${agent.id}/dossier`} variant="secondary">
          Dossier numérique
        </ButtonLink>
        {canWrite ? <ButtonLink href={`/agents/${agent.id}/edit`}>Modifier</ButtonLink> : null}
      </PageHeader>
      {msg ? <Alert>{msg}</Alert> : null}
      <div className="grid grid-3">
        <Card>
          <h3>Identité</h3>
          <p style={{ marginTop: 8 }}>{agent.sexe === "F" ? "Madame" : "Monsieur"}</p>
          <p className="muted">
            Né{agent.sexe === "F" ? "e" : ""} le {formatDate(agent.dateNaissance)} à {agent.lieuNaissance}
          </p>
          <p className="muted">{agent.nationalite} · {agent.situationMatrimoniale} · {agent.nombreEnfants} enfant(s)</p>
        </Card>
        <Card>
          <h3>Contact</h3>
          <p style={{ marginTop: 8 }}>{agent.telephone}</p>
          <p className="muted">{agent.email}</p>
          <p className="muted">{agent.adresse}</p>
        </Card>
        <Card>
          <h3>Situation</h3>
          <p style={{ marginTop: 8 }}>
            <StatutBadge value={agent.statut} /> <SituationBadge value={agent.situation} />
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            {agent.categorie}
            {agent.classe}.{agent.echelon} · depuis le {formatDate(agent.dateEntree)}
          </p>
          {chef ? <p className="muted">Chef : {fullName(chef)}</p> : null}
        </Card>
      </div>
      <div className="grid grid-2">
        <Card>
          <h3>Formation et poste</h3>
          <p style={{ marginTop: 8 }}>{agent.formation} — {agent.diplome}</p>
          <p className="muted">{agent.service}</p>
          {compte ? (
            <p className="muted">Compte : {compte.identifiant} ({compte.actif ? "actif" : "inactif"})</p>
          ) : (
            <p className="muted">Aucun compte membre lié.</p>
          )}
        </Card>
        <Card>
          <h3>Titularisation</h3>
          {agent.examenTitularisation ? (
            <p style={{ marginTop: 8 }}>
              {agent.examenTitularisation.resultat} le {formatDate(agent.examenTitularisation.date)} ·{" "}
              {agent.examenTitularisation.reference}
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 8 }}>
              Pas encore de décision de titularisation.
            </p>
          )}
          {agent.finParcours ? (
            <p style={{ marginTop: 8 }}>
              Fin de parcours : {FIN_LABELS[agent.finParcours.type]} le {formatDate(agent.finParcours.date)}
            </p>
          ) : null}
        </Card>
      </div>
      {canWrite && agent.situation === "stagiaire" ? (
        <Card>
          <h3>Enregistrer la titularisation</h3>
          <form className="form" onSubmit={onTitulariser} style={{ marginTop: 12 }}>
            <div className="form-row-3">
              <Field label="Date de l'examen">
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} required />
              </Field>
              <Field label="Résultat">
                <select value={examRes} onChange={(e) => setExamRes(e.target.value as "admis" | "ajourne")}>
                  <option value="admis">Admis</option>
                  <option value="ajourne">Ajourné</option>
                </select>
              </Field>
              <Field label="Référence de la décision">
                <input value={examRef} onChange={(e) => setExamRef(e.target.value)} required />
              </Field>
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </Card>
      ) : null}
      {canWrite && agent.situation !== "fin_parcours" ? (
        <Card>
          <h3>Fin de parcours</h3>
          <form className="form" onSubmit={onFin} style={{ marginTop: 12 }}>
            <div className="form-row">
              <Field label="Type">
                <select value={finType} onChange={(e) => setFinType(e.target.value as FinParcoursType)}>
                  {Object.entries(FIN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" value={finDate} onChange={(e) => setFinDate(e.target.value)} required />
              </Field>
            </div>
            <Field label="Motif">
              <textarea value={finMotif} onChange={(e) => setFinMotif(e.target.value)} required />
            </Field>
            <Field label="Référence (optionnel)">
              <input value={finRef} onChange={(e) => setFinRef(e.target.value)} />
            </Field>
            <Button type="submit" variant="danger">
              Enregistrer la fin de parcours
            </Button>
          </form>
        </Card>
      ) : null}
      <p>
        <Link className="link" href="/agents">
          Retour à la liste
        </Link>
      </p>
    </>
  );
}
