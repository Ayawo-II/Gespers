"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/mock/store";
import { landingPathForRole } from "@/lib/rbac";
import { Loading } from "@/components/ui";

export default function Home() {
  const { ready, session, currentCompte } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!session || !currentCompte) {
      router.replace("/connexion");
      return;
    }
    router.replace(landingPathForRole(currentCompte.role));
  }, [ready, session, currentCompte, router]);

  return <Loading />;
}
