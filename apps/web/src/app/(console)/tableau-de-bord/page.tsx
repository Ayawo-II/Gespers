"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { PieChart } from "@/components/charts";
import { SituationBadge, StatutBadge } from "@/components/status";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/api-store";
import { CLASSE_LABELS, ROLE_LABELS } from "@/lib/types";
import { apiFetch } from "@/services/api";
import { addMonths, formatDate, fullName, lastAvancementDate } from "@/lib/utils";
import { agentsDeMaDivision, agentsDeMaSection } from "@/lib/visibility";

const STATUT_COLORS: Record<string, string> = {
  FONCTIONNAIRE: "#008751", // Vert Togo
  CONTRACTUEL: "#FFCE00",   // Jaune Togo
  PIGISTE: "#E30613",       // Rouge Togo
};

const SITUATION_COLORS: Record<string, string> = {
  TITULAIRE: "#008751",     // Vert Togo
  STAGIAIRE: "#FFCE00",     // Jaune Togo
  SORTI: "#E30613",         // Rouge Togo
};

export default function DashboardPage() {
  const { state, currentCompte, currentAgent } = useStore();
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch<{ data: Record<string, number> }>("/api/v1/dashboard/summary");
        if (!ignore) setSummary(res.data);
      } catch {
        if (!ignore) setSummary(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);
  if (!currentCompte || !currentAgent) return null;

  const role = currentCompte.role;
  const isAgent = role === "AGENT" || role === "agent";
  const isChefSection = role === "CHEF_SECTION" || role === "chef";
  const isChefDivision = role === "CHEF_DIVISION";

  const estActif = (a: (typeof state.agents)[number]) =>
    a.etatCarriere !== "SORTI" && a.situation !== "SORTI" && a.situation !== "fin_parcours";
  const estFonctionnaire = (a: (typeof state.agents)[number]) =>
    a.typeAgent === "FONCTIONNAIRE" || a.statut === "FONCTIONNAIRE";
  const estTitulaire = (a: (typeof state.agents)[number]) =>
    a.etatCarriere === "TITULAIRE" || a.situation === "titulaire";

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const horizon = addMonths(aujourdHui, 3);

  // --- Périmètre visible selon le rôle ---
  const perimetreContext = {
    affectations: state.affectations,
    sections: state.sections,
    divisions: state.divisions,
  };
  const perimetre = isAgent
    ? [currentAgent]
    : isChefSection
      ? agentsDeMaSection(state.agents, currentAgent, perimetreContext)
      : isChefDivision
        ? agentsDeMaDivision(state.agents, currentAgent, perimetreContext)
        : state.agents;

  const perimetreLabel = isAgent
    ? "vous concernant"
    : isChefSection
      ? "de votre section"
      : isChefDivision
        ? "de votre division"
        : "au niveau national";

  // --- Indicateurs calculés sur le périmètre ---
  const isNational = !(isAgent || isChefSection || isChefDivision);
  const effectif = isNational && summary?.totalAgents ? summary.totalAgents : perimetre.length;
  const effectifActif = isNational && summary?.agentsActifs ? summary.agentsActifs : perimetre.filter(estActif).length;
  const titulaires = perimetre.filter(
    (a) => a.etatCarriere === "TITULAIRE" || a.situation === "titulaire",
  ).length;
  const stagiaires = perimetre.filter(
    (a) => a.etatCarriere === "STAGIAIRE" || a.situation === "stagiaire",
  ).length;
  const enCoursTitul = titulaires + stagiaires;
  const tauxTitularisation = enCoursTitul ? Math.round((titulaires / enCoursTitul) * 100) : 0;

  const avancementsProches = perimetre
    .filter((a) => estActif(a) && estFonctionnaire(a) && estTitulaire(a))
    .map((a) => ({
      agent: a,
      prochaine: addMonths(lastAvancementDate(a, state.avancements), 24),
    }))
    .filter((x) => x.prochaine <= horizon)
    .sort((x, y) => x.prochaine.localeCompare(y.prochaine));

  const statutSlices = [
    {
      label: "Fonctionnaire",
      value: perimetre.filter((a) => a.typeAgent === "FONCTIONNAIRE" || a.statut === "FONCTIONNAIRE").length,
      color: STATUT_COLORS.FONCTIONNAIRE,
    },
    {
      label: "Contractuel",
      value: perimetre.filter((a) => a.typeAgent === "CONTRACTUEL" || a.statut === "CONTRACTUEL").length,
      color: STATUT_COLORS.CONTRACTUEL,
    },
    {
      label: "Pigiste (Pivoté)",
      value: perimetre.filter((a) => a.typeAgent === "PIGISTE" || a.statut === "PIGISTE").length,
      color: STATUT_COLORS.PIGISTE,
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
          <span>{isAgent ? "Dernier avancement" : "Taux de titularisation"}</span>
          {isAgent ? (
            <>
              <strong>{formatDate(lastAvancementDate(currentAgent, state.avancements))}</strong>
              <em>Enregistrement manuel</em>
            </>
          ) : (
            <>
              <strong>{tauxTitularisation}%</strong>
              <em>{titulaires} titulaires / {enCoursTitul} concernés</em>
            </>
          )}
        </Card>

        <Card className="kpi">
          <span>{isAgent ? "Échéance indicative (2 ans)" : "Agents actifs"}</span>
          {isAgent ? (
            <>
              <strong>{formatDate(addMonths(lastAvancementDate(currentAgent, state.avancements), 24))}</strong>
              <em>Avancement manuel</em>
            </>
          ) : (
            <>
              <strong>{effectifActif}</strong>
              <em>sur {effectif} agents</em>
            </>
          )}
        </Card>

        <Card className="kpi">
          <span>{isAgent ? "Documents au dossier" : "Avancements à surveiller"}</span>
          <strong>
            {isAgent
              ? state.documents.filter((d) => d.agentId === currentAgent.id && !d.archive).length
              : avancementsProches.length}
          </strong>
          <em>{isAgent ? "Pièces actives" : "Échéance 2 ans dans 3 mois ou dépassée"}</em>
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
          Alertes avancement manuel · 3 mois restants avant l&apos;échéance de 2 ans ({avancementsProches.length})
        </h3>

        {avancementsProches.length === 0 ? (
          <p className="muted">
            {isAgent
              ? "Aucune échéance de 2 ans dans les 3 prochains mois."
              : "Aucun agent n'arrive à 3 mois de l'échéance de 2 ans sans avancement."}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {avancementsProches.slice(0, 8).map(({ agent: a, prochaine }) => {
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
                    {enRetard
                      ? `Échéance dépassée (${Math.abs(jours)} j)`
                      : `Dans ${jours} j`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

    </>
  );
}
