"use client";

import { ApiStoreProvider } from "@/lib/store/api-store";
import { HeaderProvider } from "@/lib/header-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApiStoreProvider>
      <HeaderProvider>{children}</HeaderProvider>
    </ApiStoreProvider>
  );
}
