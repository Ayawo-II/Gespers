"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type HeaderContextType = {
  headerTitle: string | null;
  headerSubtitle: string | null;
  setHeaderInfo: (info: { title?: string | null; subtitle?: string | null }) => void;
};

const HeaderContext = createContext<HeaderContextType>({
  headerTitle: null,
  headerSubtitle: null,
  setHeaderInfo: () => {},
});

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<{ title?: string | null; subtitle?: string | null }>({
    title: null,
    subtitle: null,
  });

  return (
    <HeaderContext.Provider
      value={{
        headerTitle: info.title ?? null,
        headerSubtitle: info.subtitle ?? null,
        setHeaderInfo: setInfo,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  return useContext(HeaderContext);
}
