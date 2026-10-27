"use client";

import { FormEvent, useState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store/api-store";

export function FirstLoginGate() {
  const { session, changePassword, logout } = useStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword.length < 12) {
      setError("Le nouveau mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Les deux saisies du nouveau mot de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero" />
      <section className="login-panel">
        <form className="login-card" onSubmit={onSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            <h1 style={{ color: "var(--navy)", fontSize: "24px" }}>
              Changement de mot de passe obligatoire
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>
              Compte : {session?.email}. Définissez un mot de passe personnel
              avant d&apos;accéder à votre espace.
            </p>
          </div>

          {error ? <Alert type="error">{error}</Alert> : null}

          <Field label="Mot de passe temporaire">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          <Field label="Nouveau mot de passe">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>

          <Field label="Confirmer le nouveau mot de passe">
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>

          <Button type="submit" style={{ marginTop: 6, padding: "12px" }} disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
          </Button>
          <Button type="button" variant="ghost" onClick={logout}>
            Se déconnecter
          </Button>
        </form>
      </section>
    </div>
  );
}
