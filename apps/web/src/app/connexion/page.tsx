"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/mock/store";
import { MOCK_PASSWORD } from "@/lib/mock/seed";
import { Alert, Button, Field } from "@/components/ui";

const HINTS = [
  { id: "agent.kodjo", role: "Agent" },
  { id: "chef.ama", role: "Cheffe de section" },
  { id: "rh.adjovi", role: "Responsable RH" },
  { id: "chef.personnel", role: "Chef du personnel" },
  { id: "dg.amouzou", role: "Directeur général" },
];

export default function LoginPage() {
  const { ready, session, login } = useStore();
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("chef.personnel");
  const [motDePasse, setMotDePasse] = useState(MOCK_PASSWORD);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && session) router.replace("/tableau-de-bord");
  }, [ready, session, router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = login(identifiant, motDePasse);
    if (!res.ok) setError(res.error);
    else router.push("/tableau-de-bord");
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div>
          <p className="muted" style={{ color: "#dcefe3" }}>
            République togolaise · Radio Lomé
          </p>
          <h2>Gestion administrative et suivi des agents</h2>
          <p style={{ marginTop: 16, maxWidth: 480, opacity: 0.9 }}>
            Dossiers numériques, avancements, courriers du ministère, congés et tableaux de bord
            selon le profil.
          </p>
        </div>
        <p style={{ opacity: 0.8 }}>Gespers · version 1.0 · données de démonstration</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={onSubmit}>
          <div className="brand" style={{ border: 0, padding: 0 }}>
            <div className="brand-mark">RL</div>
            <div>
              <h1 style={{ color: "var(--ink)" }}>Connexion</h1>
              <p style={{ color: "var(--muted)" }}>Identifiant et mot de passe</p>
            </div>
          </div>
          {error ? <Alert type="error">{error}</Alert> : null}
          <Field label="Identifiant">
            <input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
          </Field>
          <Field label="Mot de passe">
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </Field>
          <Button type="submit">Se connecter</Button>
          <div className="accounts-hint">
            <strong>Comptes de démonstration</strong>
            <span>Mot de passe commun : {MOCK_PASSWORD}</span>
            {HINTS.map((h) => (
              <button
                type="button"
                key={h.id}
                onClick={() => {
                  setIdentifiant(h.id);
                  setMotDePasse(MOCK_PASSWORD);
                  setError("");
                }}
              >
                {h.id} — {h.role}
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
