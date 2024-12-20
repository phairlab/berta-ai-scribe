import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  use,
  useMemo,
  useState,
} from "react";

import { Encounter } from "@/core/types";
import { InvalidOperationError } from "@/utility/errors";

import { useEncounters } from "./encounters-context";

type ContextValue = [string | null, Dispatch<SetStateAction<string | null>>];
type ProviderProps = { children: ReactNode };

const ActiveEncounterContext = createContext<ContextValue | undefined>(
  undefined,
);

function ActiveEncounterProvider({ children }: ProviderProps) {
  const [activeEncounter, setActiveEncounter] = useState<string | null>(null);

  const value: ContextValue = useMemo(
    () => [activeEncounter, setActiveEncounter],
    [activeEncounter],
  );

  return (
    <ActiveEncounterContext.Provider value={value}>
      {children}
    </ActiveEncounterContext.Provider>
  );
}

function useActiveEncounter() {
  const context = use(ActiveEncounterContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useActiveEncounter must be used within an ActiveEncounterProvider",
    );
  }

  const [activeEncounterId, setActiveEncounter] = context;
  const { list: encounters } = useEncounters();

  const activeEncounter =
    encounters.find((e) => e.id === activeEncounterId) ?? null;

  return [activeEncounter, setActiveEncounter] as [
    Encounter | null,
    Dispatch<SetStateAction<string | null>>,
  ];
}

export { ActiveEncounterProvider, useActiveEncounter };
