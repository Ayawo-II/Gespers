"use client";

import { MockStoreProvider } from "@/lib/mock/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <MockStoreProvider>{children}</MockStoreProvider>;
}
