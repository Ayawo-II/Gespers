"use client";

import { MockStoreProvider } from "@/lib/mock/store";
import { HeaderProvider } from "@/lib/header-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MockStoreProvider>
      <HeaderProvider>{children}</HeaderProvider>
    </MockStoreProvider>
  );
}
