"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/store/api-store";
import { landingPathForRole } from "@/lib/rbac";
import {
  CLASSE_LABELS,
  CONGE_LABELS,
  COURRIER_LABELS,
  DOCUMENT_LABELS,
  ROLE_LABELS,
} from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import {
  IconBuilding,
  IconCalendar,
  IconFileText,
  IconKey,
  IconMail,
  IconUser,
  IconUsers,
} from "@/components/Icons";

export default function MoiPage() {
  const { state, currentAgent, currentCompte } = useStore();
  const [activeTab, setActiveTab] = useState<
    "mon_compte" | "carriere" | "mes_dossiers" | "conges_courriers"
  >("mon_compte");

  if (!currentAgent || !currentCompte) return null;

  const docs = state.documents.filter((d) => d.agentId === currentAgent.id);
  const avs = state.avancements.filter((a) => a.agentId === currentAgent.id);
  const conges = state.conges.filter((c) => c.agentId === currentAgent.id);
  const affs = state.affectations.filter((a) => a.agentId === currentAgent.id);
  const courriers = state.courriers.filter((c) => c.agentId === currentAgent.id);
  const chef = currentAgent.chefId ? state.agents.find((a) => a.id === currentAgent.chefId) : null;

  return (
    <>
      <PageHeader
        title="Moi"
        subtitle={`Espace personnel & professionnel · Matricule ${currentAgent.matricule}`}
      />

      {/* Profil Agent Synthèse Header */}
      <Card style={{ padding: 24, borderLeft: "6px solid var(--green)" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div
            className="avatar"
            style={{ width: 64, height: 64, fontSize: 24, background: "var(--navy)", color: "#ffffff" }}
          >
            {currentAgent.prenoms[0]}
            {currentAgent.nom[0]}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22, color: "var(--navy)" }}>{fullName(currentAgent)}</h2>
              <span className="badge badge-green">Matricule : {currentAgent.matricule}</span>
            </div>
            <p style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>
              {currentAgent.fonction || currentAgent.poste} — <strong>{currentAgent.service}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <StatutBadge value={currentAgent.typeAgent || currentAgent.statut} />
              <SituationBadge value={currentAgent.etatCarriere || currentAgent.situation} />
              <span className="badge badge-gold">
                Catégorie {currentAgent.categorie} · {CLASSE_LABELS[currentAgent.classe] ?? currentAgent.classe} · Échelon {currentAgent.echelon}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Onglets de navigation dans l'espace "Moi" */}
      <div className="tabs" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={`tab ${activeTab === "mon_compte" ? "active" : ""}`}
          onClick={() => setActiveTab("mon_compte")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconUser size={16} /> Mon compte
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "carriere" ? "active" : ""}`}
          onClick={() => setActiveTab("carriere")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconBuilding size={16} /> Carrière
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "mes_dossiers" ? "active" : ""}`}
          onClick={() => setActiveTab("mes_dossiers")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconFileText size={16} /> Mes dossiers ({docs.length})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "conges_courriers" ? "active" : ""}`}
          onClick={() => setActiveTab("conges_courriers")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconCalendar size={16} /> Congés & Courriers ({conges.length + courriers.length})
        </button>
      </div>

      {/* ONGLET 1: Mon compte (Compte Utilisateur + Infos Personnelles) */}
      {activeTab === "mon_compte" ? (
        <div className="stack" style={{ gap: 16 }}>
          {/* Section Compte Utilisateur */}
          <Card>
            <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <IconKey size={20} /> Compte utilisateur Gespers
            </h3>
            <div className="grid grid-3">
              <div>
                <span className="muted">Identifiant de connexion :</span>
                <p style={{ fontWeight: 700, marginTop: 4 }}>{currentCompte.identifiant}</p>
              </div>
              <div>
                <span className="muted">Adresse e-mail :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentCompte.email || currentAgent.email}</p>
              </div>
              <div>
                <span className="muted">Rôle & Permissions :</span>
                <p style={{ fontWeight: 700, marginTop: 4 }}>{ROLE_LABELS[currentCompte.role] ?? currentCompte.role}</p>
              </div>
              <div>
                <span className="muted">Statut du compte :</span>
                <p style={{ marginTop: 4 }}>
                  {currentCompte.actif ? (
                    <span className="badge badge-green">Compte Actif</span>
                  ) : (
                    <span className="badge badge-red">Compte Inactif</span>
                  )}
                </p>
              </div>
              <div>
                <span className="muted">Date de création :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{formatDate(currentCompte.createdAt)}</p>
              </div>
            </div>
          </Card>

          {/* Section Infos Personnelles & Coordonnées */}
          <Card>
            <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <IconUser size={20} /> Informations personnelles & État civil
            </h3>
            <div className="grid grid-3">
              <div>
                <span className="muted">Nom & Prénoms :</span>
                <p style={{ fontWeight: 700, marginTop: 4 }}>{fullName(currentAgent)}</p>
              </div>
              <div>
                <span className="muted">Sexe :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>
                  {currentAgent.sexe === "M" ? "Masculin (M)" : "Féminin (F)"}
                </p>
              </div>
              <div>
                <span className="muted">Date & Lieu de naissance :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>
                  {formatDate(currentAgent.dateNaissance)} à {currentAgent.lieuNaissance}
                </p>
              </div>
              <div>
                <span className="muted">Nationalité :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.nationalite || "Togolaise"}</p>
              </div>
              <div>
                <span className="muted">Situation matrimoniale :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.situationMatrimoniale || "Célibataire"}</p>
              </div>
              <div>
                <span className="muted">Enfants à charge (nbreEnfant) :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.nbreEnfant ?? currentAgent.nombreEnfants ?? 0} enfant(s)</p>
              </div>
              <div>
                <span className="muted">Personne à prévenir (Nom) :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.nomPersonnePrevenir || "Non renseigné"}</p>
              </div>
              <div>
                <span className="muted">Personne à prévenir (Contact) :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.contactPersonnePrevenir || "Non renseigné"}</p>
              </div>
              <div>
                <span className="muted">Téléphone portable :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.telephone}</p>
              </div>
              <div>
                <span className="muted">Adresse de résidence :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.adresse}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ONGLET 2: Carrière */}
      {activeTab === "carriere" ? (
        <div className="stack" style={{ gap: 16 }}>
          {/* Situation Administrative & Poste */}
          <Card>
            <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <IconUsers size={20} /> Situation administrative & Affectation
            </h3>
            <div className="grid grid-3">
              <div>
                <span className="muted">Matricule Officiel :</span>
                <p style={{ fontWeight: 700, marginTop: 4 }}>{currentAgent.matricule}</p>
              </div>
              <div>
                <span className="muted">Type d’Agent (typeAgent) :</span>
                <p style={{ marginTop: 4 }}>
                  <StatutBadge value={currentAgent.typeAgent || currentAgent.statut} />
                </p>
              </div>
              <div>
                <span className="muted">État de Carrière (etatCarriere) :</span>
                <p style={{ marginTop: 4 }}>
                  <SituationBadge value={currentAgent.etatCarriere || currentAgent.situation} />
                </p>
              </div>
              <div>
                <span className="muted">Grade & Position :</span>
                <p style={{ fontWeight: 700, marginTop: 4, color: "var(--green-dark)" }}>
                  Catégorie {currentAgent.categorie} · {CLASSE_LABELS[currentAgent.classe] ?? currentAgent.classe} · Échelon {currentAgent.echelon} (Indice {currentAgent.indice ?? "—"})
                </p>
              </div>
              <div>
                <span className="muted">Fonction / Poste :</span>
                <p style={{ fontWeight: 700, marginTop: 4 }}>{currentAgent.fonction || currentAgent.poste}</p>
              </div>
              <div>
                <span className="muted">Division / Service :</span>
                <p style={{ fontWeight: 700, marginTop: 4 }}>{currentAgent.service}</p>
              </div>
              <div>
                <span className="muted">Date d’entrée en service :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{formatDate(currentAgent.dateEntree)}</p>
              </div>
              <div>
                <span className="muted">Date de titularisation :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>
                  {currentAgent.dateTitularisation ? formatDate(currentAgent.dateTitularisation) : "—"}
                </p>
              </div>
              <div>
                <span className="muted">Chef hiérarchique direct :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>
                  {chef ? fullName(chef) : "Chef de division"}
                </p>
              </div>
            </div>
          </Card>

          {/* Formation & Diplômes */}
          <Card>
            <h3 style={{ color: "var(--navy)", marginBottom: 16 }}>Diplômes & Qualifications</h3>
            <div className="grid grid-2">
              <div>
                <span className="muted">Diplôme certifié :</span>
                <p style={{ fontWeight: 700, marginTop: 4 }}>{currentAgent.diplome}</p>
              </div>
              <div>
                <span className="muted">Filière / Formation d’origine :</span>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{currentAgent.formation || "—"}</p>
              </div>
            </div>
          </Card>

          {/* Historique des Avancements & Affectations */}
          <Card>
            <h3 style={{ color: "var(--navy)", marginBottom: 16 }}>Historique des Avancements (Mods) & Affectations</h3>
            {avs.length === 0 && affs.length === 0 ? (
              <p className="muted">Aucun historique d’avancement ou d’affectation enregistré.</p>
            ) : (
              <div className="timeline">
                {avs.map((a) => (
                  <div className="timeline-item" key={a.id}>
                    <strong style={{ color: "var(--navy)" }}>
                      Avancement de {a.nature} ({a.mode || a.type}) — Effectif au {formatDate(a.dateEffet)}
                    </strong>
                    <p style={{ fontSize: 13, marginTop: 2 }}>
                      Nouveau grade : Catégorie {a.nvCategorie || a.nouvelleCategorie} · {CLASSE_LABELS[a.nvClasse || a.nouvelleClasse] ?? (a.nvClasse || a.nouvelleClasse)} · Échelon {a.nvEchelon || a.nouvelEchelon}
                    </p>
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
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {/* ONGLET 3: Mes dossiers */}
      {activeTab === "mes_dossiers" ? (
        <Card>
          <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <IconFileText size={20} /> Mes pièces justificatives & Documents numériques
          </h3>
          {docs.length === 0 ? (
            <p className="muted">Aucun document numérique associé à votre dossier pour le moment.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Titre du document</th>
                    <th>Type de pièce</th>
                    <th>Fichier & Version</th>
                    <th>Date de numérisation</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => {
                    const lastVer = d.versions[d.versions.length - 1];
                    return (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.titre}</strong>
                        </td>
                        <td>
                          <span className="badge badge-gray">{DOCUMENT_LABELS[d.type]}</span>
                        </td>
                        <td>
                          {lastVer ? (
                            <span>
                              <code>{lastVer.nomFichier}</code> ({lastVer.tailleKo} Ko, v{lastVer.version})
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{formatDate(d.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {/* ONGLET 4: Congés & Courriers */}
      {activeTab === "conges_courriers" ? (
        <div className="grid grid-2">
          <Card>
            <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <IconCalendar size={20} /> Historique des congés
            </h3>
            {conges.length === 0 ? (
              <p className="muted">Aucun congé enregistré.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {conges.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: "10px 12px",
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                    }}
                  >
                    <strong>{CONGE_LABELS[c.type]}</strong>
                    <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      Du {formatDate(c.dateDebut)} au {formatDate(c.dateFin)} ({c.dureeJours} jours)
                    </p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                      Réf : <code>{c.referenceDecision}</code>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 style={{ color: "var(--navy)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <IconMail size={20} /> Courriers & Actes associés
            </h3>
            {courriers.length === 0 ? (
              <p className="muted">Aucun courrier ministériel adressé spécifiquement à votre dossier.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {courriers.map((courrier) => (
                  <div
                    key={courrier.id}
                    style={{
                      padding: "10px 12px",
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>{courrier.reference}</strong>
                      <span className="badge badge-blue">{COURRIER_LABELS[courrier.type]}</span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{courrier.objet}</p>
                    <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      Du {formatDate(courrier.date)} · Émetteur : {courrier.expediteur}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          Pour tout besoin de mise à jour de vos informations personnelles ou professionnelles, veuillez adresser une demande au <strong>Service du Personnel de Radio Lomé</strong>.{" "}
          <Link className="link" href={landingPathForRole(currentCompte.role)}>
            Retour à mon espace →
          </Link>
        </p>
      </div>
    </>
  );
}
