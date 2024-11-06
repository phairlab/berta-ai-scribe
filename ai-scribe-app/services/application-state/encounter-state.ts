import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { Encounter } from "@/core/types";
import { byDate } from "@/utility/sorters";

import { LoadingStatus } from "./application-state-context";

type Setter<T> = Dispatch<SetStateAction<T>>;

export type EncounterState = {
  status: LoadingStatus;
  list: Encounter[];
  activeEncounter: Encounter | null;
  exists: (id: string) => boolean;
  get: (id: string) => Encounter | undefined;
  put: (data: Encounter) => void;
  remove: (id: string) => void;
  setActive: (id: string | null) => void;
};

export function useEncounterState(
  status: LoadingStatus,
  encounters: Encounter[],
  activeEncounter: Encounter | null,
  setEncounters: Setter<Encounter[]>,
  setActiveEncounter: Setter<Encounter | null>,
) {
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(
    null,
  );

  // Set the active encounter on the next render.
  // This allows it to be set at the same time as the encounter is added
  // and still find it in the list.
  useEffect(() => {
    const id = activeEncounterId;

    if (id) {
      setActiveEncounter(encounters.find((e) => e.id === id) ?? null);
    } else {
      setActiveEncounter(null);
    }
  }, [activeEncounterId]);

  // Synch the active encounter with changes to encounter state.
  useEffect(() => {
    if (activeEncounter) {
      setActiveEncounter(
        encounters.find((e) => e.id === activeEncounter.id) ?? null,
      );
    }
  }, [encounters]);

  return {
    status: status,
    list: encounters,
    activeEncounter: activeEncounter,
    exists: (id: string) => encounters.some((e) => e.id === id),
    get: (id: string) => encounters.find((e) => e.id === id),
    put: (data: Encounter) => {
      setEncounters((encounters) =>
        [...encounters.filter((e) => e.id !== data.id), data].sort(
          byDate((x) => x.created, "Descending"),
        ),
      );
    },
    remove: (id: string) => {
      setEncounters((encounters) => [...encounters.filter((e) => e.id !== id)]);
    },
    setActive: (id: string | null) => {
      setActiveEncounterId(id);
    },
  } satisfies EncounterState;
}
