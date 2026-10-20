"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useHeader } from "@/lib/header-context";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { setHeaderInfo } = useHeader();

  useEffect(() => {
    if (title || subtitle) {
      setHeaderInfo({ title, subtitle });
    }
    return () => {
      setHeaderInfo({ title: null, subtitle: null });
    };
  }, [title, subtitle, setHeaderInfo]);

  if (!children) return null;

  return (
    <div className="page-actions-bar" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
      <div className="actions">{children}</div>
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

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <section className={`card ${className}`} style={style}>{children}</section>;
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
  style,
}: {
  children: ReactNode;
  tone?: "green" | "gold" | "red" | "gray" | "blue";
  style?: React.CSSProperties;
}) {
  return <span className={`badge badge-${tone}`} style={style}>{children}</span>;
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
