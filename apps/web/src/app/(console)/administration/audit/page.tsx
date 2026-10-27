"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import type { EntreeAudit } from "@/lib/types";
import { downloadText, formatDateTime, toCsv } from "@/lib/utils";

const PAGE_SIZE = 25;

const ACTION_OPTIONS = [
  { value: "connexion", label: "Connexion réussie" },
  { value: "connexion_echouee", label: "Échec de connexion" },
  { value: "deconnexion", label: "Déconnexion" },
  { value: "changement_mot_de_passe", label: "Changement de mot de passe" },
  { value: "creation_agent", label: "Création d'agent" },
  { value: "modification_agent", label: "Modification d'agent" },
  { value: "mise_a_jour_agent_affectation", label: "Changement d'affectation" },
  { value: "modification_photo_agent", label: "Modification de photo" },
  { value: "creation_compte", label: "Création de compte" },
  { value: "changement_role", label: "Changement de rôle" },
  { value: "gestion_permissions", label: "Délégation de permissions" },
  { value: "reset_mot_de_passe", label: "Réinitialisation de mot de passe" },
  { value: "desactivation_compte", label: "Désactivation de compte" },
  { value: "reactivation_compte", label: "Réactivation de compte" },
  { value: "creation_division", label: "Création de division" },
  { value: "modification_division", label: "Modification de division" },
  { value: "creation_section", label: "Création de section" },
  { value: "modification_section", label: "Modification de section" },
  { value: "telechargement_document", label: "Téléchargement de document" },
  { value: "archivage_document", label: "Archivage de document" },
  { value: "creation_courrier", label: "Création de courrier" },
  { value: "modification_courrier", label: "Modification de courrier" },
  { value: "enregistrement_conge", label: "Enregistrement de congé" },
  { value: "modification_conge", label: "Modification de congé" },
  { value: "titularisation", label: "Titularisation" },
  { value: "cloture_parcours", label: "Clôture de parcours" },
  { value: "avancement_manuel", label: "Avancement manuel" },
  { value: "parametrage_grille", label: "Paramétrage de grille" },
  { value: "export_agents_csv", label: "Export agents CSV" },
  { value: "export_documents_zip", label: "Export documents ZIP" },
];

const ACTION_LABELS = Object.fromEntries(
  ACTION_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export default function AuditPage() {
  const { loadAudit } = useStore();
  const [rows, setRows] = useState<EntreeAudit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const res = await loadAudit({
        page,
        limit: PAGE_SIZE,
        q: q.trim() || undefined,
        action: action || undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });
      if (cancelled) return;
      if (res.ok) {
        setRows(res.rows);
        setTotal(res.total);
      } else {
        setError(res.error);
        setRows([]);
        setTotal(0);
      }
      setLoading(false);
    }, q ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [loadAudit, page, q, action, dateDebut, dateFin]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        subtitle="Connexions, échecs, déconnexions, écritures et accès sensibles"
      >
        <Button
          variant="secondary"
          disabled={rows.length === 0}
          onClick={() =>
            downloadText(
              "audit-gespers.csv",
              toCsv(
                rows.map((entry) => ({
                  date: entry.date,
                  identifiant: entry.identifiant ?? "",
                  action: ACTION_LABELS[entry.action] ?? entry.action,
                  cible: entry.cible,
                  details: entry.details,
                  justification: entry.justification ?? "",
                })),
              ),
            )
          }
        >
          Exporter la page
        </Button>
      </PageHeader>
      {error ? <Alert type="error">{error}</Alert> : null}
      <Card>
        <div className="filters">
          <input
            placeholder="Auteur, cible, détails…"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
          />
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Toutes les actions</option>
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Du
            <input
              type="date"
              value={dateDebut}
              onChange={(event) => {
                setDateDebut(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Au
            <input
              type="date"
              value={dateFin}
              onChange={(event) => {
                setDateFin(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        {loading ? (
          <p className="muted" style={{ marginTop: 12 }}>Chargement du journal…</p>
        ) : rows.length === 0 ? (
          <Empty title="Aucune entrée" hint="Aucun résultat pour ces filtres." />
        ) : (
          <>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Auteur</th>
                    <th>Action</th>
                    <th>Cible</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.date)}</td>
                      <td>{entry.identifiant ?? "—"}</td>
                      <td>{ACTION_LABELS[entry.action] ?? entry.action}</td>
                      <td>{entry.cible}</td>
                      <td>
                        {entry.details}
                        {entry.justification ? (
                          <div className="muted">{entry.justification}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              <span className="muted">
                {from}–{to} sur {total} entrée{total > 1 ? "s" : ""}
              </span>
              <div className="actions">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Précédent
                </Button>
                <span className="muted">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
