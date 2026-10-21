"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/mock/store";
import { landingPathForRole } from "@/lib/rbac";
import { MOCK_PASSWORD } from "@/lib/mock/seed";
import { Alert, Button, Field } from "@/components/ui";
import { Bubbles } from "@/components/Bubbles";

const HINTS = [
  { id: "agent.kodjo", role: "Agent" },
  { id: "chef.ama", role: "Cheffe de section" },
  { id: "chef.tech", role: "Chef de division" },
  { id: "rh.adjovi", role: "Responsable RH" },
  { id: "chef.personnel", role: "Chef du personnel" },
  { id: "dg.amouzou", role: "Directeur général" },
];

export default function LoginPage() {
  const { ready, session, currentCompte, login, resetData } = useStore();
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("chef.personnel");
  const [motDePasse, setMotDePasse] = useState(MOCK_PASSWORD);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (ready && session && currentCompte) {
      router.replace(landingPathForRole(currentCompte.role));
    }
  }, [ready, session, currentCompte, router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = login(identifiant, motDePasse);
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
            <h1 style={{ color: "var(--navy)", fontSize: "24px" }}>Connexion Gespers</h1>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>
              Saisissez vos identifiants pour accéder à votre espace
            </p>
          </div>

          {error ? <Alert type="error">{error}</Alert> : null}
          {info ? <Alert>{info}</Alert> : null}

          <Field label="Identifiant">
            <input
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="ex: chef.personnel"
              required
            />
          </Field>

          <Field label="Mot de passe">
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </Field>

          <Button type="submit" style={{ marginTop: 6, padding: "12px" }}>
            Se connecter au portail
          </Button>

          <div className="accounts-hint">
            <strong>Comptes de démonstration rapide :</strong>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              Mot de passe générique : <code>{MOCK_PASSWORD}</code>
            </span>
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
                <strong>{h.id}</strong> — {h.role}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                resetData();
                setError("");
                setInfo("Données de démonstration rechargées.");
              }}
              style={{ textDecoration: "underline" }}
            >
              Réinitialiser les données de démonstration
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
