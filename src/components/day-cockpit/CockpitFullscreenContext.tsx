import { createContext, useContext, useState, type ReactNode } from "react";

interface CockpitFullscreenContextType {
  isFullscreen: boolean;
  setFullscreen: (v: boolean) => void;
}

const CockpitFullscreenContext = createContext<CockpitFullscreenContextType>({
  isFullscreen: false,
  setFullscreen: () => {},
});

export function CockpitFullscreenProvider({ children }: { children: ReactNode }) {
  const [isFullscreen, setFullscreen] = useState(false);
  return (
    <CockpitFullscreenContext.Provider value={{ isFullscreen, setFullscreen }}>
      {children}
    </CockpitFullscreenContext.Provider>
  );
}

export function useCockpitFullscreen() {
  return useContext(CockpitFullscreenContext);
}
