"use client";

import { CourrierForm } from "@/components/CourrierForm";
import { PageHeader } from "@/components/ui";

export default function NouveauCourrierPage() {
  return (
    <>
      <PageHeader title="Nouveau courrier" subtitle="Enregistrement au registre administratif" />
      <CourrierForm isNew />
    </>
  );
}
