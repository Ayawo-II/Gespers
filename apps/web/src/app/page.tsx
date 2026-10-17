"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/mock/store";
import { Loading } from "@/components/ui";

export default function Home() {
  const { ready, session } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(session ? "/tableau-de-bord" : "/connexion");
  }, [ready, session, router]);

  return <Loading />;
}
