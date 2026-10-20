"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Empty, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/mock/store";
import { hasPermission } from "@/lib/rbac";
import { fullName, uid } from "@/lib/utils";

export default function DivisionsPage() {
  const { state, currentCompte, saveDivision, saveSection } = useStore();
  const canWrite = currentCompte ? hasPermission(currentCompte.role, "organisation.write") : false;

  const [showNewDivision, setShowNewDivision] = useState(false);
  const [divisionLibelle, setDivisionLibelle] = useState("");
  const [divisionChefId, setDivisionChefId] = useState("");

  const [sectionFormFor, setSectionFormFor] = useState<string | null>(null);
  const [sectionLibelle, setSectionLibelle] = useState("");
  const [sectionChefId, setSectionChefId] = useState("");

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const divisions = useMemo(() => {
    const agentsById = new Map(state.agents.map((a) => [a.id, a]));
    return state.divisions.map((d) => ({
      ...d,
      chef: d.chefId ? agentsById.get(d.chefId) : undefined,
      effectif: state.agents.filter((a) => a.service === d.libelle).length,
      sections: state.sections
        .filter((s) => s.divisionId === d.id)
        .map((s) => ({ ...s, chef: s.chefId ? agentsById.get(s.chefId) : undefined })),
    }));
  }, [state.divisions, state.sections, state.agents]);

  const totalSections = divisions.reduce((n, d) => n + d.sections.length, 0);

  function onCreateDivision(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!divisionLibelle.trim()) {
      setError("Le libellé de la division est obligatoire.");
      return;
    }
    const res = saveDivision(
      {
        id: uid("div"),
        libelle: divisionLibelle.trim(),
        chefId: divisionChefId || undefined,
      },
      true,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(`Division « ${divisionLibelle.trim()} » créée.`);
    setDivisionLibelle("");
    setDivisionChefId("");
    setShowNewDivision(false);
  }

  function onCreateSection(e: FormEvent, divisionId: string) {
    e.preventDefault();
    setError("");
    if (!sectionLibelle.trim()) {
      setError("Le libellé de la section est obligatoire.");
      return;
    }
    const res = saveSection(
      {
        id: uid("sec"),
        libelle: sectionLibelle.trim(),
        divisionId,
        chefId: sectionChefId || undefined,
      },
      true,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg(`Section « ${sectionLibelle.trim()} » ajoutée.`);
    setSectionLibelle("");
    setSectionChefId("");
    setSectionFormFor(null);
  }

  function toggleSectionForm(divisionId: string) {
    if (sectionFormFor === divisionId) {
      setSectionFormFor(null);
      return;
    }
    setSectionLibelle("");
    setSectionChefId("");
    setSectionFormFor(divisionId);
  }

  return (
    <>
      <PageHeader
        title="Divisions"
        subtitle="Organigramme de Radio Lomé : divisions, sections et responsables"
      >
        <Badge tone="blue">{divisions.length} divisions</Badge>
        <Badge tone="gray">{totalSections} sections</Badge>
        {canWrite ? (
          <Button variant="secondary" onClick={() => setShowNewDivision((v) => !v)}>
            {showNewDivision ? "Fermer" : "Ajouter une division"}
          </Button>
        ) : null}
      </PageHeader>

      {msg ? <Alert>{msg}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      {canWrite && showNewDivision ? (
        <Card style={{ marginBottom: 16, borderLeft: "6px solid var(--green)" }}>
          <h3 style={{ color: "var(--navy)", marginBottom: 12 }}>Nouvelle division</h3>
          <form className="form" onSubmit={onCreateDivision}>
            <div className="form-row">
              <Field label="Libellé de la division">
                <input
                  value={divisionLibelle}
                  onChange={(e) => setDivisionLibelle(e.target.value)}
                  placeholder="Ex: Division de la communication"
                  required
                />
              </Field>
              <Field label="Chef de division (optionnel)">
                <select value={divisionChefId} onChange={(e) => setDivisionChefId(e.target.value)}>
                  <option value="">Non renseigné</option>
                  {state.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {fullName(a)} — {a.fonction || a.poste}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Button type="submit">Créer la division</Button>
          </form>
        </Card>
      ) : null}

      {divisions.length === 0 ? (
        <Card>
          <Empty title="Aucune division" hint="L'organigramme n'est pas encore renseigné." />
        </Card>
      ) : (
        <div className="grid-2">
          {divisions.map((d) => (
            <Card key={d.id}>
              <div className="page-head">
                <div>
                  <h2>{d.libelle}</h2>
                  <p>
                    {d.chef ? `Chef : ${fullName(d.chef)}` : "Chef non renseigné"}
                  </p>
                </div>
                <div className="actions">
                  <Badge tone="green">{d.effectif} agent{d.effectif > 1 ? "s" : ""}</Badge>
                  {canWrite ? (
                    <Button variant="secondary" onClick={() => toggleSectionForm(d.id)}>
                      {sectionFormFor === d.id ? "Annuler" : "Ajouter une section"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {canWrite && sectionFormFor === d.id ? (
                <form className="form" onSubmit={(e) => onCreateSection(e, d.id)} style={{ marginBottom: 12 }}>
                  <div className="form-row">
                    <Field label="Libellé de la section">
                      <input
                        value={sectionLibelle}
                        onChange={(e) => setSectionLibelle(e.target.value)}
                        placeholder="Ex: Section reportages"
                        required
                      />
                    </Field>
                    <Field label="Chef de section (optionnel)">
                      <select value={sectionChefId} onChange={(e) => setSectionChefId(e.target.value)}>
                        <option value="">Non renseigné</option>
                        {state.agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {fullName(a)} — {a.fonction || a.poste}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Button type="submit">Ajouter la section</Button>
                </form>
              ) : null}

              {d.sections.length === 0 ? (
                <p className="muted">Aucune section.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Section</th>
                        <th>Chef de section</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.sections.map((s) => (
                        <tr key={s.id}>
                          <td>{s.libelle}</td>
                          <td>{s.chef ? fullName(s.chef) : <span className="muted">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
