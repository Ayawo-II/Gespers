"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, Card, Empty, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import { DOCUMENT_LABELS, type DocumentDossier, type TypeDocument } from "@/lib/types";
import { downloadText, formatDateTime, fullName, uid } from "@/lib/utils";
import { canSeeAgent } from "@/lib/visibility";

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentCompte, currentAgent, saveDocument, archiveDocument, replaceDocumentVersion } =
    useStore();
  const agent = state.agents.find((a) => a.id === id);
  const [type, setType] = useState<TypeDocument>("piece_identite");
  const [titre, setTitre] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [motif, setMotif] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (!agent || !canSeeAgent(agent, currentCompte, currentAgent)) {
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

  async function replace(doc: DocumentDossier) {
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

  async function archive(doc: DocumentDossier) {
    if (!motif.trim()) {
      setMsg("Indiquez un motif d'archivage (aucune suppression définitive).");
      return;
    }
    const res = await archiveDocument(doc.id, motif);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg("Document archivé. Il reste consultable dans l'historique.");
  }

  return (
    <>
      <PageHeader
        title={`Dossier numérique — ${fullName(agent)}`}
        subtitle="Archive officielle : pièces, diplômes, arrêtés, contrats et décisions"
      >
        <button
          className="btn btn-secondary"
          onClick={() =>
            downloadText(
              `dossier-${agent.matricule}.txt`,
              [
                `Dossier ${fullName(agent)} (${agent.matricule})`,
                ...docs.map(
                  (d) =>
                    `- ${DOCUMENT_LABELS[d.type]} : ${d.titre} (${d.versions.length} version(s))${d.archive ? " [archivé]" : ""}`,
                ),
              ].join("\n"),
              "text/plain;charset=utf-8",
            )
          }
        >
          Exporter le dossier
        </button>
      </PageHeader>
      {msg ? <Alert type={msg.includes("motif") ? "warn" : "ok"}>{msg}</Alert> : null}
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
                        <div key={v.id} className="muted">
                          v{v.version} · {v.nomFichier} · {formatDateTime(v.uploadedAt)}
                        </div>
                      ))}
                    </td>
                    <td>{d.archive ? "Archivé" : "Actif"}</td>
                    <td>
                      {canWrite && !d.archive ? (
                        <div className="actions">
                          <button className="btn btn-secondary" onClick={() => replace(d)}>
                            Remplacer
                          </button>
                          <button className="btn btn-danger" onClick={() => archive(d)}>
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
        {canWrite ? (
          <Field label="Motif d'archivage (obligatoire, journalisé)">
            <input value={motif} onChange={(e) => setMotif(e.target.value)} />
          </Field>
        ) : null}
      </Card>
      <p>
        <Link className="link" href={`/agents/${agent.id}`}>
          Fiche agent
        </Link>
      </p>
    </>
  );
}
