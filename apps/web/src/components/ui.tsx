"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children ? <div className="actions">{children}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <Link className={`btn btn-${variant}`} href={href}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Alert({
  type = "ok",
  children,
}: {
  type?: "ok" | "error" | "warn";
  children: ReactNode;
}) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}

export function Loading() {
  return <div className="loading">Chargement des données…</div>;
}

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "green" | "gold" | "red" | "gray" | "blue";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      {label}
      {children}
      {hint ? <span>{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
