"use client";

import { FormEvent, useState } from "react";
import { Alert, Button, Card, Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";

function parseList(value: string) {
  return value
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function GrillesPage() {
  const { state, updateGrille } = useStore();
  const [categories, setCategories] = useState(state.grille.categories.join(", "));
  const [classes, setClasses] = useState(state.grille.classes.join(", "));
  const [echelons, setEchelons] = useState(state.grille.echelons.join(", "));
  const [dureeEchelonMois, setDureeEchelon] = useState(String(state.grille.dureeEchelonMois));
  const [dureeClasseMois, setDureeClasse] = useState(String(state.grille.dureeClasseMois));
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const cats = parseList(categories);
    const cls = parseList(classes);
    const ech = parseList(echelons);
    const dEch = Number(dureeEchelonMois);
    const dCl = Number(dureeClasseMois);
    if (!cats.length || !cls.length || !ech.length) {
      setError("Catégories, classes et échelons sont obligatoires.");
      return;
    }
    if (!dEch || dEch < 1 || !dCl || dCl < 1) {
      setError("Les durées doivent être des nombres positifs (en mois).");
      return;
    }
    const res = await updateGrille({
      categories: cats,
      classes: cls,
      echelons: ech,
      dureeEchelonMois: dEch,
      dureeClasseMois: dCl,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMsg("Grille enregistrée. Les éligibilités automatiques utilisent ces durées.");
  }

  return (
    <>
      <PageHeader
        title="Grilles d'avancement"
        subtitle="Paramètres utilisés pour les propositions automatiques de classe et d'échelon"
      />
      {msg ? <Alert>{msg}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <Card>
        <form className="form" onSubmit={onSubmit}>
          <Field label="Catégories" hint="Séparées par des virgules">
            <input value={categories} onChange={(e) => setCategories(e.target.value)} />
          </Field>
          <Field label="Classes">
            <input value={classes} onChange={(e) => setClasses(e.target.value)} />
          </Field>
          <Field label="Échelons">
            <input value={echelons} onChange={(e) => setEchelons(e.target.value)} />
          </Field>
          <div className="form-row">
            <Field label="Durée d'un échelon (mois)">
              <input type="number" min={1} value={dureeEchelonMois} onChange={(e) => setDureeEchelon(e.target.value)} />
            </Field>
            <Field label="Durée d'une classe (mois)">
              <input type="number" min={1} value={dureeClasseMois} onChange={(e) => setDureeClasse(e.target.value)} />
            </Field>
          </div>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Card>
    </>
  );
}
