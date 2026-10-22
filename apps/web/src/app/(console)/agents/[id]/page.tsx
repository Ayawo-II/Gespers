"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, ButtonLink, Card, Empty, Field, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import {
  CATEGORIE_LABELS,
  CLASSE_LABELS,
  DOCUMENT_LABELS,
  MOTIF_DEPART_LABELS,
  RESULTAT_EXAMEN_LABELS,
  type Categorie,
  type Classe,
  type DocumentDossier,
  type FinParcoursType,
  type NatureModif,
  type ResultatExamen,
  type TypeDocument,
} from "@/lib/types";
import { daysBetween, formatDate, formatDateTime, fullName, todayIso, uid } from "@/lib/utils";
import { canSeeAgent } from "@/lib/visibility";
import {
  IconFileText,
  IconMail,
  IconUser,
  IconUsers,
} from "@/components/Icons";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    state,
    currentCompte,
    currentAgent,
    titulariser,
    cloreParcours,
    saveDocument,
    archiveDocument,
    replaceDocumentVersion,
    enregistrerAvancement,
  } = useStore();

  const agent = state.agents.find((a) => a.id === id);

  // Panneaux inline (sans redirection)
  const [showCarriere, setShowCarriere] = useState(false);
  const [showDossier, setShowDossier] = useState(false);

  // Formulaire Avancement manuel (inline)
  const [avDate, setAvDate] = useState(todayIso());
  const [avNature, setAvNature] = useState<NatureModif>("ECHELON");
  const [avCategorie, setAvCategorie] = useState<Categorie>("C");
  const [avClasse, setAvClasse] = useState<Classe>("CLASSE_3");
  const [avEchelon, setAvEchelon] = useState<string | number>(1);
  const [avJustification, setAvJustification] = useState("");

  // Formulaire Titularisation & Fin de parcours
  const [examDate, setExamDate] = useState("");
  const [examRef, setExamRef] = useState("");
  const [examRes, setExamRes] = useState<ResultatExamen>("ADMIS");
  const [finType, setFinType] = useState<FinParcoursType>("RETRAITE");
  const [finDate, setFinDate] = useState("");
  const [finMotif, setFinMotif] = useState("");
  const [finRef, setFinRef] = useState("");

  // Formulaire Ajout Document
  const [docTitre, setDocTitre] = useState("");
  const [docType, setDocType] = useState<TypeDocument>("diplome");
  const [docFichier, setDocFichier] = useState<File | null>(null);

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (!agent || !canSeeAgent(agent, currentCompte, currentAgent)) {
    return <Empty title="Agent introuvable" hint="Ce dossier n'existe pas ou n'est pas dans votre périmètre." />;
  }

  const canWrite = currentCompte ? hasPermission(currentCompte.role, "agents.write") : false;
  const chef = agent.chefId ? state.agents.find((a) => a.id === agent.chefId) : null;

  const docs = state.documents.filter((d) => d.agentId === agent.id);
  const avs = state.avancements.filter((a) => a.agentId === agent.id);
  const affs = state.affectations.filter((a) => a.agentId === agent.id);

  function toggleCarriere() {
    if (!showCarriere) {
      setAvCategorie(agent?.categorie ?? "C");
      setAvClasse(agent?.classe ?? "CLASSE_3");
      setAvEchelon(agent?.echelon ?? 1);
    }
    setShowCarriere((v) => !v);
  }

  async function onAvancement(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!avJustification.trim()) {
      setError("Une justification est obligatoire pour un avancement manuel.");
      return;
    }
    const res = await enregistrerAvancement({
      agentId: agent!.id,
      dateEffet: avDate,
      ancCategorie: agent!.categorie,
      nvCategorie: avCategorie || agent!.categorie,
      ancClasse: agent!.classe,
      nvClasse: avClasse || agent!.classe,
      ancEchelon: agent!.echelon,
      nvEchelon: avEchelon || agent!.echelon,
      ancFonction: agent!.fonction || agent!.poste || "",
      nvFonction: agent!.fonction || agent!.poste || "",
      mode: "MANUEL",
      type: "MANUEL",
      nature: avNature,
      justification: avJustification,
      ancienneCategorie: agent!.categorie,
      nouvelleCategorie: avCategorie || agent!.categorie,
      ancienneClasse: agent!.classe,
      nouvelleClasse: avClasse || agent!.classe,
      ancienEchelon: agent!.echelon,
      nouvelEchelon: avEchelon || agent!.echelon,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg("Avancement manuel enregistré et journalisé.");
    setAvJustification("");
    setShowCarriere(false);
  }

  async function onReplaceVersion(doc: DocumentDossier) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const res = await replaceDocumentVersion(
        doc.id,
        {
          id: uid("dv"),
          version: doc.versions.length + 1,
          nomFichier: file.name,
          tailleKo: Math.max(1, Math.round(file.size / 1024)),
          mime: file.type || "application/octet-stream",
          uploadedAt: new Date().toISOString(),
          auteurId: currentCompte?.id ?? "cpt-systeme",
        },
        file,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMsg("Nouvelle version enregistrée. Les versions précédentes sont conservées.");
    };
    input.click();
  }

  async function onArchiveDoc(doc: DocumentDossier) {
    const res = await archiveDocument(doc.id, "Archivage depuis la fiche agent");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg("Document archivé. Il reste consultable dans l'historique.");
  }

  async function onTitulariser(e: FormEvent) {
    e.preventDefault();
    if (!examDate || !examRef) return;
    setError("");
    const res = await titulariser(agent!.id, { date: examDate, resultat: examRes, reference: examRef });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg("Titularisation enregistrée avec succès.");
  }

  async function onFin(e: FormEvent) {
    e.preventDefault();
    if (!finDate || !finMotif) return;
    setError("");
    const res = await cloreParcours(agent!.id, { type: finType, date: finDate, motif: finMotif, reference: finRef || undefined });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg("Fin de parcours enregistrée avec succès.");
  }

  async function onAddDocument(e: FormEvent) {
    e.preventDefault();
    if (!docTitre.trim() || !docFichier) {
      setError("Titre et fichier sont obligatoires.");
      return;
    }
    setError("");
    const res = await saveDocument(
      {
        id: uid("doc"),
        agentId: agent!.id,
        personneId: agent!.id,
        type: docType,
        titre: docTitre,
        archive: false,
        createdAt: new Date().toISOString(),
        versions: [],
      },
      docFichier,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(`Document "${docTitre}" ajouté au dossier numérique.`);
    setDocTitre("");
    setDocFichier(null);
  }

  const isStagiaire = agent.etatCarriere === "STAGIAIRE" || agent.situation === "stagiaire" || agent.situation === "STAGIAIRE";
  const isSorti = agent.etatCarriere === "SORTI" || agent.situation === "fin_parcours" || agent.situation === "SORTI";
  const ancienneteJours = daysBetween(agent.dateEntree, todayIso());
  const ancienneteAns = Math.floor(ancienneteJours / 365);

  return (
    <>
      <PageHeader
        title={fullName(agent)}
        subtitle={`${agent.matricule} · ${agent.fonction || agent.poste} · ${agent.service}`}
      >
        {canWrite ? <ButtonLink href={`/agents/${agent.id}/edit`}>Modifier la fiche</ButtonLink> : null}
        {canWrite ? (
          <Button variant="secondary" onClick={toggleCarriere}>
            {showCarriere ? "Fermer l'avancement" : "Avancement manuel"}
          </Button>
        ) : null}
        {canWrite ? (
          <Button variant="secondary" onClick={() => setShowDossier((v) => !v)}>
            {showDossier ? "Fermer le dossier" : "Gérer le dossier"}
          </Button>
        ) : null}
      </PageHeader>

      {msg ? <Alert>{msg}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      {/* Panneau inline : Avancement manuel */}
      {canWrite && showCarriere ? (
        <Card style={{ marginBottom: 16, borderLeft: "6px solid var(--gold)" }}>
          <h3 style={{ color: "var(--navy)", marginBottom: 12 }}>
            Avancement manuel — Catégorie, classe ou échelon (justification obligatoire)
          </h3>
          <Alert type="warn">
            Situation actuelle : Cat. {agent.categorie} · {CLASSE_LABELS[agent.classe] ?? agent.classe} · Éch. {agent.echelon} ·{" "}
            {agent.fonction || agent.poste}
          </Alert>
          <form className="form" onSubmit={onAvancement}>
            <div className="form-row">
              <Field label="Date d'effet (dateEffet)">
                <input type="date" value={avDate} onChange={(e) => setAvDate(e.target.value)} required />
              </Field>
              <Field label="Nature de modification (NatureModif)">
                <select value={avNature} onChange={(e) => setAvNature(e.target.value as NatureModif)}>
                  <option value="ECHELON">Échelon</option>
                  <option value="CLASSE">Classe</option>
                  <option value="CATEGORIE">Catégorie</option>
                </select>
              </Field>
            </div>
            <div className="form-row-3">
              <Field label="Nouvelle catégorie (nvCategorie)">
                <select value={avCategorie} onChange={(e) => setAvCategorie(e.target.value as Categorie)}>
                  {state.grille.categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIE_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nouvelle classe (nvClasse)">
                <select value={avClasse} onChange={(e) => setAvClasse(e.target.value as Classe)}>
                  {state.grille.classes.map((c) => (
                    <option key={c} value={c}>
                      {CLASSE_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nouvel échelon (nvEchelon)">
                <select value={String(avEchelon)} onChange={(e) => setAvEchelon(Number(e.target.value))}>
                  {state.grille.echelons.map((c) => (
                    <option key={c} value={c}>
                      Échelon {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Justification" hint="Motif, référence d'acte ou décision d'autorité.">
              <textarea value={avJustification} onChange={(e) => setAvJustification(e.target.value)} required />
            </Field>
            <Button type="submit">Enregistrer la modification (Mods)</Button>
          </form>
        </Card>
      ) : null}

      {/* Panneau inline : Gestion du dossier numérique */}
      {canWrite && showDossier ? (
        <Card style={{ marginBottom: 16, borderLeft: "6px solid var(--blue)" }}>
          <h3 style={{ color: "var(--navy)", marginBottom: 12 }}>Gérer le dossier numérique</h3>
          <form className="form" onSubmit={onAddDocument} style={{ marginBottom: 16 }}>
            <div className="form-row">
              <Field label="Type">
                <select value={docType} onChange={(e) => setDocType(e.target.value as TypeDocument)}>
                  {Object.entries(DOCUMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Titre">
                <input value={docTitre} onChange={(e) => setDocTitre(e.target.value)} required />
              </Field>
            </div>
            <Field label="Fichier" hint="PDF ou image (téléversé au serveur)">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setDocFichier(e.target.files?.[0] ?? null)}
                required
              />
            </Field>
            <Button type="submit">Ajouter au dossier</Button>
          </form>
          {docs.length === 0 ? (
            <p className="muted">Dossier vide.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Versions</th>
                    <th>État</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td>{d.titre}</td>
                      <td>{DOCUMENT_LABELS[d.type]}</td>
                      <td>
                        {d.versions.map((v) => (
                          <div key={v.id} className="muted" style={{ fontSize: 12 }}>
                            v{v.version} · {v.nomFichier} · {formatDateTime(v.uploadedAt)}
                          </div>
                        ))}
                      </td>
                      <td>{d.archive ? "Archivé" : "Actif"}</td>
                      <td>
                        {!d.archive ? (
                          <div className="actions">
                            <button type="button" className="btn btn-secondary" onClick={() => onReplaceVersion(d)}>
                              Remplacer
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => onArchiveDoc(d)}>
                              Archiver
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {/* Profil Agent Synthèse Header */}
      <Card style={{ padding: 24, borderLeft: "6px solid var(--green)" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div
            className="avatar"
            style={{ width: 68, height: 68, fontSize: 26, background: "var(--navy)", color: "#ffffff" }}
          >
            {agent.prenoms[0]}
            {agent.nom[0]}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 24, color: "var(--navy)" }}>{fullName(agent)}</h2>
              <span className="badge badge-green">Matricule : {agent.matricule}</span>
              {agent.estArchive ? <span className="badge badge-red">Agent archivé</span> : null}
            </div>
            <p style={{ marginTop: 4, fontSize: 15, fontWeight: 600 }}>
              {agent.fonction || agent.poste} — <strong>{agent.service}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <StatutBadge value={agent.typeAgent || agent.statut} />
              <SituationBadge value={agent.etatCarriere || agent.situation} />
              <span className="badge badge-gold">
                Catégorie {agent.categorie} · {CLASSE_LABELS[agent.classe] ?? agent.classe} · Échelon {agent.echelon} (Indice {agent.indice ?? "—"})
              </span>
              <span className="badge badge-blue">Ancienneté : {ancienneteAns} ans ({ancienneteJours} jours)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 1 : Identité & Contact */}
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card>
          <h3 style={{ color: "var(--navy)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <IconUser size={18} /> État civil & Identité
          </h3>
          <p style={{ fontWeight: 600 }}>{agent.sexe === "F" ? "Madame" : "Monsieur"} {fullName(agent)}</p>
          <p className="muted" style={{ marginTop: 4 }}>
            Né{agent.sexe === "F" ? "e" : ""} le <strong>{formatDate(agent.dateNaissance)}</strong> à <strong>{agent.lieuNaissance}</strong>
          </p>
          <p className="muted" style={{ marginTop: 4 }}>
            Nationalité : {agent.nationalite || "Togolaise"}
          </p>
          <p className="muted" style={{ marginTop: 4 }}>
            Situation matrimoniale : {agent.situationMatrimoniale || "Célibataire"}
          </p>
          <p className="muted" style={{ marginTop: 4 }}>
            Enfants à charge (nbreEnfant) : <strong>{agent.nbreEnfant ?? agent.nombreEnfants ?? 0} enfant(s)</strong>
          </p>
        </Card>

        <Card>
          <h3 style={{ color: "var(--navy)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <IconMail size={18} /> Coordonnées & Adresse
          </h3>
          <p style={{ fontWeight: 600 }}>Téléphone : {agent.telephone || "—"}</p>
          <p className="muted" style={{ marginTop: 4 }}>E-mail : {agent.email || "—"}</p>
          <p className="muted" style={{ marginTop: 4 }}>Adresse de résidence : {agent.adresse || "—"}</p>
          {agent.nomPersonnePrevenir ? (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--paper)", borderRadius: 6, border: "1px solid var(--line)" }}>
              <span className="muted" style={{ fontSize: 12 }}>Personne à prévenir en cas d&apos;urgence :</span>
              <p style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                {agent.nomPersonnePrevenir} — {agent.contactPersonnePrevenir || "Pas de numéro"}
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      {/* SECTION 2 : Situation administrative & Grade actuel */}
      <Card style={{ marginTop: 16 }}>
        <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <IconUsers size={20} /> Situation administrative & Grade actuel
        </h3>
        <div className="grid grid-3">
          <div>
            <span className="muted">Matricule Officiel :</span>
            <p style={{ fontWeight: 700, marginTop: 4 }}>{agent.matricule}</p>
          </div>
          <div>
            <span className="muted">Type d&apos;Agent (typeAgent) :</span>
            <p style={{ marginTop: 4 }}>
              <StatutBadge value={agent.typeAgent || agent.statut} />
            </p>
          </div>
          <div>
            <span className="muted">État de Carrière (etatCarriere) :</span>
            <p style={{ marginTop: 4 }}>
              <SituationBadge value={agent.etatCarriere || agent.situation} />
            </p>
          </div>
          <div>
            <span className="muted">Grade & Échelon :</span>
            <p style={{ fontWeight: 700, marginTop: 4, color: "var(--green-dark)" }}>
              Catégorie {agent.categorie} · {CLASSE_LABELS[agent.classe] ?? agent.classe} · Échelon {agent.echelon} (Indice {agent.indice ?? "—"})
            </p>
          </div>
          <div>
            <span className="muted">Fonction / Intitulé du poste :</span>
            <p style={{ fontWeight: 700, marginTop: 4 }}>{agent.fonction || agent.poste}</p>
          </div>
          <div>
            <span className="muted">Division / Service :</span>
            <p style={{ fontWeight: 700, marginTop: 4 }}>{agent.service}</p>
          </div>
          <div>
            <span className="muted">Date d&apos;entrée en service :</span>
            <p style={{ fontWeight: 600, marginTop: 4 }}>{formatDate(agent.dateEntree)}</p>
          </div>
          <div>
            <span className="muted">Date de titularisation :</span>
            <p style={{ fontWeight: 600, marginTop: 4 }}>
              {agent.dateTitularisation ? formatDate(agent.dateTitularisation) : "Non titularisé"}
            </p>
          </div>
          <div>
            <span className="muted">Chef hiérarchique direct :</span>
            <p style={{ fontWeight: 600, marginTop: 4 }}>
              {chef ? fullName(chef) : "Chef de division / Direction"}
            </p>
          </div>
          <div>
            <span className="muted">Dernier avancement :</span>
            <p style={{ fontWeight: 600, marginTop: 4 }}>
              {agent.dateDernierAvancement
                ? formatDate(agent.dateDernierAvancement)
                : avs.length > 0
                  ? formatDate(avs[avs.length - 1].dateEffet)
                  : "Aucun avancement enregistré"}
            </p>
          </div>
          <div>
            <span className="muted">Ancienneté de service :</span>
            <p style={{ fontWeight: 600, marginTop: 4 }}>{ancienneteAns} an(s) — {ancienneteJours} jours</p>
          </div>
          <div>
            <span className="muted">Diplôme le plus élevé :</span>
            <p style={{ fontWeight: 600, marginTop: 4 }}>{agent.diplome || "—"}</p>
          </div>
          {agent.dateDebutStage || agent.dateFinStagePrevue ? (
            <div>
              <span className="muted">Période de stage :</span>
              <p style={{ fontWeight: 600, marginTop: 4 }}>
                {formatDate(agent.dateDebutStage ?? undefined)} → {formatDate(agent.dateFinStagePrevue ?? undefined)} (prévu)
              </p>
            </div>
          ) : null}
          {agent.dateFinContrat ? (
            <div>
              <span className="muted">Fin de contrat prévue :</span>
              <p style={{ fontWeight: 600, marginTop: 4 }}>{formatDate(agent.dateFinContrat)}</p>
            </div>
          ) : null}
          {agent.dateDepart ? (
            <div>
              <span className="muted">Date de départ :</span>
              <p style={{ fontWeight: 600, marginTop: 4 }}>
                {formatDate(agent.dateDepart)}
                {agent.motifDepart ? ` — ${MOTIF_DEPART_LABELS[agent.motifDepart] ?? agent.motifDepart}` : ""}
              </p>
            </div>
          ) : null}
          <div>
            <span className="muted">Examen de titularisation :</span>
            {agent.examenTitularisation ? (
              <p style={{ fontWeight: 600, marginTop: 4 }}>
                {formatDate(agent.examenTitularisation.date)} —{" "}
                {RESULTAT_EXAMEN_LABELS[agent.examenTitularisation.resultat] ?? agent.examenTitularisation.resultat} (
                <code>{agent.examenTitularisation.reference}</code>)
              </p>
            ) : (
              <p className="muted" style={{ marginTop: 4 }}>Aucun examen enregistré</p>
            )}
          </div>
          <div>
            <span className="muted">Fin de parcours :</span>
            {agent.finParcours ? (
              <p style={{ fontWeight: 600, marginTop: 4 }}>
                {MOTIF_DEPART_LABELS[agent.finParcours.type] ?? agent.finParcours.type} le{" "}
                {formatDate(agent.finParcours.date)}
                {agent.finParcours.reference ? (
                  <>
                    {" "}(<code>{agent.finParcours.reference}</code>)
                  </>
                ) : null}
              </p>
            ) : (
              <p className="muted" style={{ marginTop: 4 }}>Parcours en cours</p>
            )}
          </div>
          {agent.finParcours?.motif ? (
            <div>
              <span className="muted">Motif détaillé du départ :</span>
              <p style={{ fontWeight: 600, marginTop: 4 }}>{agent.finParcours.motif}</p>
            </div>
          ) : null}
        </div>
      </Card>

      {/* SECTION 3 : Qualifications & Diplômes */}
      <Card style={{ marginTop: 16 }}>
        <h3 style={{ color: "var(--navy)", marginBottom: 16 }}>Qualifications & Diplômes</h3>
        <div className="grid grid-2">
          <div>
            <span className="muted">Dernier diplôme certifié :</span>
            <p style={{ fontWeight: 700, marginTop: 4 }}>{agent.diplome}</p>
          </div>
          <div>
            <span className="muted">Filière / Formation initiale :</span>
            <p style={{ fontWeight: 600, marginTop: 4 }}>{agent.formation || "Non renseigné"}</p>
          </div>
        </div>
      </Card>

      {/* SECTION 4 : Historique des Avancements & Affectations */}
      <Card style={{ marginTop: 16 }}>
        <h3 style={{ color: "var(--navy)", marginBottom: 16 }}>Historique des Avancements (Mods) & Affectations</h3>
        {avs.length === 0 && affs.length === 0 ? (
          <p className="muted">Aucun historique d&apos;avancement ou d&apos;affectation enregistré.</p>
        ) : (
          <div className="timeline">
            {avs.map((a) => (
              <div className="timeline-item" key={a.id}>
                <strong style={{ color: "var(--navy)" }}>
                  Avancement de {a.nature} ({a.mode || a.type}) — Effectif au {formatDate(a.dateEffet)}
                </strong>
                <p style={{ fontSize: 13, marginTop: 2 }}>
                  Ancien grade : Catégorie {a.ancCategorie || a.ancienneCategorie} · {CLASSE_LABELS[a.ancClasse || a.ancienneClasse] ?? (a.ancClasse || a.ancienneClasse)} · Échelon {a.ancEchelon || a.ancienEchelon}
                  {" → "}
                  Nouveau grade : Catégorie {a.nvCategorie || a.nouvelleCategorie} · {CLASSE_LABELS[a.nvClasse || a.nouvelleClasse] ?? (a.nvClasse || a.nouvelleClasse)} · Échelon {a.nvEchelon || a.nouvelEchelon}
                </p>
                {a.ancFonction || a.nvFonction ? (
                  <p style={{ fontSize: 13, marginTop: 2 }}>
                    Fonction : {a.ancFonction || "—"} → {a.nvFonction || "—"}
                  </p>
                ) : null}
                <p className="muted" style={{ fontSize: 12 }}>
                  {a.justification}
                </p>
              </div>
            ))}
            {affs.map((af) => (
              <div className="timeline-item" key={af.id}>
                <strong style={{ color: "var(--navy)" }}>
                  Affectation poste : {af.poste} — à partir du {formatDate(af.dateDebut)}
                </strong>
                <p className="muted" style={{ fontSize: 13 }}>
                  Service : {af.service}
                  {af.dateFin ? ` → Jusqu'au ${formatDate(af.dateFin)}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* SECTION 6 : Dossier numérique & Pièces */}
      <Card style={{ marginTop: 16 }}>
        <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <IconFileText size={20} /> Dossier numérique & Pièces ({docs.length})
          {canWrite ? (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginLeft: "auto", fontSize: 13 }}
              onClick={() => {
                setShowDossier(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Gérer les versions et l&apos;archivage ↑
            </button>
          ) : null}
        </h3>
        {docs.length === 0 ? (
          <p className="muted">Aucune pièce numérique enregistrée pour cet agent.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titre de la pièce</th>
                  <th>Type de document (TypeDoc)</th>
                  <th>Versions</th>
                  <th>État</th>
                  <th>Date d&apos;ajout</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.titre}</strong>
                      {d.reference ? (
                        <div className="muted" style={{ fontSize: 12 }}>Réf : {d.reference}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="badge badge-gray">{DOCUMENT_LABELS[d.type]}</span>
                    </td>
                    <td>
                      {d.versions.length === 0
                        ? "—"
                        : d.versions.map((v) => (
                            <div key={v.id} className="muted" style={{ fontSize: 12 }}>
                              v{v.version} · <code>{v.nomFichier}</code> · {v.tailleKo} Ko · {formatDateTime(v.uploadedAt)}
                            </div>
                          ))}
                    </td>
                    <td>
                      {d.archive ? (
                        <span className="badge badge-red">Archivé</span>
                      ) : (
                        <span className="badge badge-green">Actif</span>
                      )}
                    </td>
                    <td>{formatDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SECTION 8 : Actes & Titularisation */}
      {canWrite ? (
        <div className="stack" style={{ gap: 16, marginTop: 16 }}>
          {isStagiaire ? (
            <Card>
              <h3 style={{ color: "var(--navy)", marginBottom: 12 }}>Enregistrer la décision de titularisation</h3>
              <form className="form" onSubmit={onTitulariser}>
                <div className="form-row-3">
                  <Field label="Date de l'examen">
                    <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} required />
                  </Field>
                  <Field label="Résultat (ResultatExamen)">
                    <select value={examRes} onChange={(e) => setExamRes(e.target.value as ResultatExamen)}>
                      <option value="ADMIS">Admis</option>
                      <option value="AJOURNE">Ajourné</option>
                    </select>
                  </Field>
                  <Field label="Référence de la décision">
                    <input
                      value={examRef}
                      onChange={(e) => setExamRef(e.target.value)}
                      placeholder="Ex: ARR/MC/2026/044"
                      required
                    />
                  </Field>
                </div>
                <Button type="submit">Valider la titularisation</Button>
              </form>
            </Card>
          ) : null}

          {!isSorti ? (
            <Card>
              <h3 style={{ color: "var(--navy)", marginBottom: 12 }}>Clore le parcours de l&apos;agent (Fin de parcours)</h3>
              <form className="form" onSubmit={onFin}>
                <div className="form-row">
                  <Field label="Motif de départ (MotifDepart)">
                    <select value={finType} onChange={(e) => setFinType(e.target.value as FinParcoursType)}>
                      <option value="RETRAITE">Retraite</option>
                      <option value="DEMISSION">Démission</option>
                      <option value="REVOCATION">Révocation</option>
                      <option value="DECES">Décès</option>
                      <option value="AUTRE">Autre motif</option>
                    </select>
                  </Field>
                  <Field label="Date d'effet / départ">
                    <input type="date" value={finDate} onChange={(e) => setFinDate(e.target.value)} required />
                  </Field>
                </div>
                <Field label="Justification / Motif détaillé">
                  <textarea value={finMotif} onChange={(e) => setFinMotif(e.target.value)} required />
                </Field>
                <Field label="Référence de l'acte (optionnel)">
                  <input value={finRef} onChange={(e) => setFinRef(e.target.value)} />
                </Field>
                <Button type="submit" variant="danger">
                  Clore définitivement le parcours
                </Button>
              </form>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <p>
          <Link className="link" href="/agents">
            ← Retour à la liste des agents
          </Link>
        </p>
      </div>
    </>
  );
}
