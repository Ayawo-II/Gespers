"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";
import { hasPermission } from "@/lib/rbac";
import { COURRIER_LABELS, SERVICES, type Courrier, type TypeCourrier } from "@/lib/types";
import { todayIso, uid } from "@/lib/utils";

export function CourrierForm({ initial, isNew }: { initial?: Courrier; isNew: boolean }) {
  const { state, currentCompte, saveCourrier } = useStore();
  const router = useRouter();
  const [error, setError] = useState("");
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "courriers.write") : false;
  const [form, setForm] = useState<Courrier>(
    initial ?? {
      id: uid("cr"),
      reference: "",
      type: "entrant",
      date: todayIso(),
      objet: "",
      expediteur: "",
      destinataire: "Radio Lomé",
      resume: "",
      createdAt: new Date().toISOString(),
      auteurId: currentCompte?.id ?? "cpt-systeme",
    },
  );

  function set<K extends keyof Courrier>(key: K, value: Courrier[K]) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) {
      setError("Vous n'êtes pas habilité à enregistrer un courrier.");
      return;
    }
    const res = await saveCourrier(
      { ...form, auteurId: form.auteurId || currentCompte?.id || "cpt-systeme" },
      isNew,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/courriers/${form.id}`);
  }

  return (
    <form className="form card" onSubmit={onSubmit}>
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="form-row-3">
        <Field label="Référence">
          <input value={form.reference} onChange={(e) => set("reference", e.target.value)} required />
        </Field>
        <Field label="Type">
          <select value={form.type} onChange={(e) => set("type", e.target.value as TypeCourrier)}>
            {Object.entries(COURRIER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </Field>
      </div>
      <Field label="Objet">
        <input value={form.objet} onChange={(e) => set("objet", e.target.value)} required />
      </Field>
      <div className="form-row">
        <Field label="Expéditeur">
          <input value={form.expediteur} onChange={(e) => set("expediteur", e.target.value)} required />
        </Field>
        <Field label="Destinataire">
          <input value={form.destinataire} onChange={(e) => set("destinataire", e.target.value)} required />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Service (optionnel)">
          <select value={form.service ?? ""} onChange={(e) => set("service", e.target.value || undefined)}>
            <option value="">—</option>
            {SERVICES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Agent concerné (optionnel)">
          <select value={form.agentId ?? ""} onChange={(e) => set("agentId", e.target.value || undefined)}>
            <option value="">—</option>
            {state.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.prenoms} {a.nom} ({a.matricule})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Résumé">
        <textarea value={form.resume} onChange={(e) => set("resume", e.target.value)} />
      </Field>
      <Field label="Pièce jointe" hint="Simulation : aucun envoi serveur">
        <input
          type="file"
          onChange={(e) => set("pieceJointe", e.target.files?.[0]?.name || undefined)}
        />
        {form.pieceJointe ? (
          <span style={{ fontSize: 12 }}>
            Fichier sélectionné : <code>{form.pieceJointe}</code>
          </span>
        ) : null}
      </Field>
      {canWrite ? <Button type="submit">{isNew ? "Enregistrer" : "Mettre à jour"}</Button> : null}
    </form>
  );
}
