"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { PieChart } from "@/components/charts";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useStore } from "@/lib/mock/store";
import {
  CLASSE_LABELS,
  CONGE_LABELS,
  ROLE_LABELS,
} from "@/lib/types";
import { formatDate, fullName, isEligibleClasse, isEligibleEchelon, nextEchelonDate } from "@/lib/utils";
import { agentsDeMaDivision, agentsDeMaSection } from "@/lib/visibility";

const STATUT_COLORS: Record<string, string> = {
  FONCTIONNAIRE: "#008751", // Vert Togo
  CONTRACTUEL: "#FFCE00",   // Jaune Togo
  PIVOTE: "#E30613",        // Rouge Togo
};

const SITUATION_COLORS: Record<string, string> = {
  TITULAIRE: "#008751",     // Vert Togo
  STAGIAIRE: "#FFCE00",     // Jaune Togo
  SORTI: "#E30613",         // Rouge Togo
};

export default function DashboardPage() {
  const { state, currentCompte, currentAgent } = useStore();
  if (!currentCompte || !currentAgent) return null;

  const role = currentCompte.role;
  const isAgent = role === "AGENT" || role === "agent";
  const isChefSection = role === "CHEF_SECTION" || role === "chef";
  const isChefDivision = role === "CHEF_DIVISION";

  const estActif = (a: (typeof state.agents)[number]) =>
    a.etatCarriere !== "SORTI" && a.situation !== "SORTI" && a.situation !== "fin_parcours";
  const estFonctionnaire = (a: (typeof state.agents)[number]) =>
    a.typeAgent === "FONCTIONNAIRE" || a.statut === "fonctionnaire";
  const estTitulaire = (a: (typeof state.agents)[number]) =>
    a.etatCarriere === "TITULAIRE" || a.situation === "titulaire";

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const dans90Jours = new Date();
  dans90Jours.setDate(dans90Jours.getDate() + 90);
  const horizon = dans90Jours.toISOString().slice(0, 10);

  // --- Périmètre visible selon le rôle ---
  const perimetre = isAgent
    ? [currentAgent]
    : isChefSection
      ? agentsDeMaSection(state.agents, currentAgent)
      : isChefDivision
        ? agentsDeMaDivision(state.agents, currentAgent)
        : state.agents;

  const perimetreIds = new Set(perimetre.map((a) => a.id));
  const perimetreLabel = isAgent
    ? "vous concernant"
    : isChefSection
      ? "de votre section"
      : isChefDivision
        ? "de votre division"
        : "au niveau national";

  // --- Indicateurs calculés sur le périmètre ---
  const effectif = perimetre.length;
  const effectifActif = perimetre.filter(estActif).length;
  const titulaires = perimetre.filter(
    (a) => a.etatCarriere === "TITULAIRE" || a.situation === "titulaire",
  ).length;
  const stagiaires = perimetre.filter(
    (a) => a.etatCarriere === "STAGIAIRE" || a.situation === "stagiaire",
  ).length;
  const enCoursTitul = titulaires + stagiaires;
  const tauxTitularisation = enCoursTitul ? Math.round((titulaires / enCoursTitul) * 100) : 0;

  const congesPerimetre = state.conges.filter((c) => perimetreIds.has(c.agentId));
  const congesEnCours = congesPerimetre.filter(
    (c) => c.dateDebut <= aujourdHui && c.dateFin >= aujourdHui,
  );

  const avancementsProches = perimetre
    .filter((a) => estActif(a) && estFonctionnaire(a) && estTitulaire(a))
    .map((a) => ({
      agent: a,
      prochaine: nextEchelonDate(a, state.grille, state.avancements),
      eligible: isEligibleEchelon(a, state.grille, state.avancements) || isEligibleClasse(a, state.grille, state.avancements),
    }))
    .filter((x) => x.eligible || x.prochaine <= horizon)
    .sort((x, y) => x.prochaine.localeCompare(y.prochaine));

  const horsAvancementAuto = perimetre.filter(
    (a) => estActif(a) && !(estFonctionnaire(a) && estTitulaire(a)),
  );

  const statutSlices = [
    {
      label: "Fonctionnaire",
      value: perimetre.filter((a) => a.typeAgent === "FONCTIONNAIRE" || a.statut === "fonctionnaire").length,
      color: STATUT_COLORS.FONCTIONNAIRE,
    },
    {
      label: "Contractuel",
      value: perimetre.filter((a) => a.typeAgent === "CONTRACTUEL" || a.statut === "contractuel").length,
      color: STATUT_COLORS.CONTRACTUEL,
    },
    {
      label: "Pigiste (Pivoté)",
      value: perimetre.filter((a) => a.typeAgent === "PIVOTE" || a.statut === "pigiste").length,
      color: STATUT_COLORS.PIVOTE,
    },
  ];

  const situationSlices = [
    {
      label: "Titulaire",
      value: perimetre.filter((a) => a.etatCarriere === "TITULAIRE" || a.situation === "titulaire").length,
      color: SITUATION_COLORS.TITULAIRE,
    },
    {
      label: "Stagiaire",
      value: perimetre.filter((a) => a.etatCarriere === "STAGIAIRE" || a.situation === "stagiaire").length,
      color: SITUATION_COLORS.STAGIAIRE,
    },
    {
      label: "Fin de parcours",
      value: perimetre.filter((a) => a.etatCarriere === "SORTI" || a.situation === "fin_parcours").length,
      color: SITUATION_COLORS.SORTI,
    },
  ];

  const parDivision =
    isAgent || isChefSection || isChefDivision
      ? []
      : state.divisions.map((d) => ({
          division: d,
          effectif: state.agents.filter((a) => a.service === d.libelle).length,
        }));
  const maxDivision = Math.max(1, ...parDivision.map((x) => x.effectif));
  const totalDivision = parDivision.reduce((n, x) => n + x.effectif, 0);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${currentAgent.prenoms.split(" ")[0]}`}
        subtitle={`${ROLE_LABELS[role] ?? role} · ${currentAgent.fonction || currentAgent.poste} · ${currentAgent.service}`}
      />

      <div className="grid grid-4">
        <Card className="kpi">
          <span>{isAgent ? "Ma situation" : `Effectif ${perimetreLabel}`}</span>
          {isAgent ? (
            <>
              <strong>
                {currentAgent.categorie} · {CLASSE_LABELS[currentAgent.classe] ?? currentAgent.classe} · Éch. {currentAgent.echelon}
              </strong>
              <em>
                <StatutBadge value={currentAgent.typeAgent || currentAgent.statut} />{" "}
                <SituationBadge value={currentAgent.etatCarriere || currentAgent.situation} />
              </em>
            </>
          ) : (
            <>
              <strong>{effectif}</strong>
              <em>{effectifActif} agents actifs</em>
            </>
          )}
        </Card>

        <Card className="kpi">
          <span>{isAgent ? "Prochain échelon (estimé)" : "Taux de titularisation"}</span>
          {isAgent ? (
            <>
              <strong>{formatDate(nextEchelonDate(currentAgent, state.grille, state.avancements))}</strong>
              <em>Règle : {state.grille.dureeEchelonMois} mois</em>
            </>
          ) : (
            <>
              <strong>{tauxTitularisation}%</strong>
              <em>{titulaires} titulaires / {enCoursTitul} concernés</em>
            </>
          )}
        </Card>

        <Card className="kpi">
          <span>{isAgent ? "Mes congés enregistrés" : "Congés en cours"}</span>
          <strong>{isAgent ? congesPerimetre.length : congesEnCours.length}</strong>
          <em>
            {isAgent
              ? "Historique personnel"
              : `${congesPerimetre.length} congé(s) au total`}
          </em>
        </Card>

        <Card className="kpi">
          <span>{isAgent ? "Documents au dossier" : "Avancements à surveiller"}</span>
          <strong>
            {isAgent
              ? state.documents.filter((d) => d.agentId === currentAgent.id && !d.archive).length
              : avancementsProches.length}
          </strong>
          <em>{isAgent ? "Pièces actives" : "Échéances ≤ 90 jours ou en retard"}</em>
        </Card>
      </div>

      {parDivision.length > 0 ? (
        <>
          <div className="grid grid-2">
            <Card>
              <PieChart title="Répartition par statut (TypeAgent)" slices={statutSlices} />
            </Card>
            <Card>
              <PieChart title="Répartition par situation (EtatCarriere)" slices={situationSlices} />
            </Card>
          </div>

          <Card>
            <h3 style={{ marginBottom: 16, color: "var(--navy)" }}>Répartition par division</h3>
            <div className="bar-chart">
              {parDivision.map(({ division, effectif: eff }) => {
                const pct = totalDivision ? Math.round((eff / totalDivision) * 100) : 0;
                const barPct = maxDivision ? Math.round((eff / maxDivision) * 100) : 0;
                return (
                  <div className="bar-row" key={division.id}>
                    <div className="bar-label">{division.libelle}</div>
                    <div className="bar-track">
                      <span className="bar-fill" style={{ width: `${barPct}%` }} />
                    </div>
                    <div className="bar-value">
                      {eff} <span className="bar-pct">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

      <Card>
        <h3 style={{ marginBottom: 16, color: "var(--navy)" }}>
          Alertes avancement · échéances proches ({avancementsProches.length})
        </h3>

        {avancementsProches.length === 0 ? (
          <p className="muted">
            {isAgent
              ? "Aucune échéance d'avancement dans les 90 prochains jours."
              : "Aucun avancement ne parvient à terme dans les 90 prochains jours."}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {avancementsProches.slice(0, 8).map(({ agent: a, prochaine, eligible }) => {
              const jours = Math.round(
                (new Date(prochaine).getTime() - new Date(aujourdHui).getTime()) / 86400000,
              );
              const enRetard = prochaine < aujourdHui;
              return (
                <div
                  key={a.id}
                  style={{
                    padding: "12px 14px",
                    background: enRetard ? "var(--danger-soft, #fdecea)" : "var(--warning-soft, #fff8e1)",
                    border: `1px solid ${enRetard ? "var(--danger, #e30613)" : "var(--warning, #ffce00)"}`,
                    borderRadius: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <Link className="link" href={`/agents/${a.id}`}>
                      {fullName(a)}
                    </Link>
                    <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {a.fonction || a.poste} · {a.service}
                    </p>
                  </div>
                  <span
                    className={enRetard ? "badge badge-red" : "badge badge-green"}
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                  >
                    {eligible
                      ? "Éligible maintenant"
                      : enRetard
                        ? `En retard (${Math.abs(jours)} j)`
                        : `Dans ${jours} j`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {!isAgent ? (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "var(--navy)", margin: 0 }}>
              Hors avancement automatique ({horsAvancementAuto.length})
            </h3>
          </div>

          {horsAvancementAuto.length === 0 ? (
            <p className="muted">Tous les agents actifs relèvent de l&apos;avancement automatique.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Fonction</th>
                    <th>Statut</th>
                    <th>Situation</th>
                  </tr>
                </thead>
                <tbody>
                  {horsAvancementAuto.slice(0, 10).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link className="link" href={`/agents/${a.id}`}>
                          {fullName(a)}
                        </Link>
                      </td>
                      <td>{a.fonction || a.poste}</td>
                      <td>
                        <StatutBadge value={a.typeAgent || a.statut} />
                      </td>
                      <td>
                        <SituationBadge value={a.etatCarriere || a.situation} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {!isAgent ? (
        <Card>
          <h3 style={{ marginBottom: 12, color: "var(--navy)" }}>
            Effectif {perimetreLabel} ({effectif})
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Fonction</th>
                  <th>Situation</th>
                  <th>Congé en cours</th>
                </tr>
              </thead>
              <tbody>
                {perimetre
                  .filter((a) => a.id !== currentAgent.id)
                  .map((a) => {
                    const leave = congesEnCours.find((c) => c.agentId === a.id);
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link className="link" href={`/agents/${a.id}`}>
                            {fullName(a)}
                          </Link>
                        </td>
                        <td>{a.fonction || a.poste}</td>
                        <td>
                          <StatutBadge value={a.typeAgent || a.statut} />{" "}
                          <SituationBadge value={a.etatCarriere || a.situation} />
                        </td>
                        <td>{leave ? CONGE_LABELS[leave.type] : "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </>
  );
}
