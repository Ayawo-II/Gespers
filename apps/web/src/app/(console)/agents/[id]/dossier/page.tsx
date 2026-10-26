"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, Card, Empty, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import { DOCUMENT_LABELS, type TypeDocument } from "@/lib/types";
import { formatDate, fullName, uid } from "@/lib/utils";
import { canSeeAgent } from "@/lib/visibility";

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentCompte, currentAgent, saveDocument } = useStore();
  const agent = state.agents.find((a) => a.id === id);
  const [type, setType] = useState<TypeDocument>("piece_identite");
  const [titre, setTitre] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (
    !agent ||
    !canSeeAgent(agent, currentCompte, currentAgent, {
      affectations: state.affectations,
      sections: state.sections,
      divisions: state.divisions,
    })
  ) {
    return <Empty title="Dossier inaccessible" />;
  }

  const canWrite = currentCompte ? hasPermission(currentCompte.role, "agents.write") : false;
  const docs = state.documents.filter((d) => d.agentId === agent.id);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!titre.trim() || !fichier) {
      setError("Titre et fichier sont obligatoires.");
      return;
    }
    const res = await saveDocument(
      {
        id: uid("doc"),
        agentId: agent!.id,
        personneId: agent!.id,
        type,
        titre,
        archive: false,
        createdAt: new Date().toISOString(),
        versions: [],
      },
      fichier,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTitre("");
    setFichier(null);
    setMsg("Fichier ajouté au dossier numérique.");
  }



  return (
    <>
      <PageHeader
        title={`Dossier numérique — ${fullName(agent)}`}
        subtitle="Archive officielle : pièces, diplômes, arrêtés, contrats et décisions"
      >
        <button
          className="btn btn-secondary"
          onClick={async () => {
            try {
              const { apiDownload, triggerBrowserDownload } = await import("@/services/api");
              const blob = await apiDownload(`/api/v1/documents/export.zip?personneId=${agent.id}`);
              triggerBrowserDownload(blob, `dossier-${agent.matricule}.zip`);
            } catch (error) {
              console.error(error);
            }
          }}
        >
          Exporter le dossier (ZIP)
        </button>
      </PageHeader>
      {msg ? <Alert>{msg}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      {canWrite ? (
        <Card>
          <h3>Téléverser un fichier</h3>
          <form className="form" onSubmit={onAdd} style={{ marginTop: 12 }}>
            <div className="form-row-3">
              <Field label="Type">
                <select value={type} onChange={(e) => setType(e.target.value as TypeDocument)}>
                  {Object.entries(DOCUMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Titre">
                <input value={titre} onChange={(e) => setTitre(e.target.value)} required />
              </Field>
              <Field label="Nom du fichier scanné" hint="PDF ou image (téléversé au serveur)">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                  required
                />
              </Field>
            </div>
            <Button type="submit">Ajouter</Button>
          </form>
        </Card>
      ) : null}
      <Card>
        <h3>Pièces du dossier</h3>
        {docs.length === 0 ? (
          <Empty title="Dossier vide" />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Fichier</th>
                  <th>Date d&apos;ajout</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>{d.titre}</td>
                    <td>{DOCUMENT_LABELS[d.type]}</td>
                    <td>
                      <span className="muted">{d.versions[0]?.nomFichier ?? "—"}</span>
                    </td>
                    <td>{formatDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </Card>
      <p>
        <Link className="link" href={`/agents/${agent.id}`}>
          Fiche agent
        </Link>
      </p>
    </>
  );
}
