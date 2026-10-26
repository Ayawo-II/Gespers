"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store/api-store";
import { landingPathForRole } from "@/lib/rbac";
import { Alert, Button, Field } from "@/components/ui";
import { Bubbles } from "@/components/Bubbles";

const HINTS = [
  { id: "chef.personnel@radiolome.tg", role: "Chef du personnel" },
];

export default function LoginPage() {
  const { ready, session, currentCompte, login } = useStore();
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("chef.personnel@radiolome.tg");
  const [motDePasse, setMotDePasse] = useState("RadioLome2026!");
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session && currentCompte) {
      router.replace(landingPathForRole(currentCompte.role));
    }
  }, [ready, session, currentCompte, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(identifiant, motDePasse);
    setLoading(false);
    if (!res.ok) setError(res.error);
    else router.push(landingPathForRole(res.role));
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <Bubbles />
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={onSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            <h1 style={{ color: "var(--navy)", fontSize: "24px" }}>Connexion Gespres_RL</h1>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>
              Saisissez vos identifiants pour accéder à votre espace
            </p>
          </div>

          {error ? <Alert type="error">{error}</Alert> : null}

          <Field label="Identifiant">
            <input
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="ex: chef.personnel@radiolome.tg"
              required
            />
          </Field>

          <Field label="Mot de passe">
            <span className="password-input">
              <input
                type={afficherMotDePasse ? "text" : "password"}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setAfficherMotDePasse((v) => !v)}
                aria-label={afficherMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={afficherMotDePasse}
              >
                {afficherMotDePasse ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </Field>

          <Button type="submit" style={{ marginTop: 6, padding: "12px" }} disabled={loading}>
            {loading ? "Connexion..." : "Se connecter au portail"}
          </Button>

          <div className="accounts-hint">
            <strong>Comptes de démonstration (API) :</strong>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              Mot de passe générique : <code>RadioLome2026!</code>
            </span>
            {HINTS.map((h) => (
              <button
                type="button"
                key={h.id}
                onClick={() => {
                  setIdentifiant(h.id);
                  setMotDePasse("RadioLome2026!");
                  setError("");
                }}
              >
                <strong>{h.id}</strong> — {h.role}
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
