import { useEffect, useState } from "react";

import { Encounter } from "@/core/types";
import { byDate } from "@/utility/sorters";

import { LoadingStatus } from "./application-state-context";

type Setter<T> = (state: T) => void;

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
      setActiveEncounter(encounters.find((e) => e.uuid === id) ?? null);
    } else {
      setActiveEncounter(null);
    }
  }, [activeEncounterId]);

  // Synch the active encounter with changes to encounter state.
  useEffect(() => {
    if (activeEncounter) {
      setActiveEncounter(
        encounters.find((e) => e.uuid === activeEncounter.uuid) ?? null,
      );
    }
  }, [encounters]);

  return {
    status: status,
    list: encounters,
    activeEncounter: activeEncounter,
    exists: (id: string) => encounters.some((e) => e.uuid === id),
    get: (id: string) => encounters.find((e) => e.uuid === id),
    put: (data: Encounter) => {
      setEncounters(
        [...encounters.filter((e) => e.uuid !== data.uuid), data].sort(
          byDate((x) => x.createdAt, "Descending"),
        ),
      );
    },
    remove: (id: string) => {
      setEncounters([...encounters.filter((e) => e.uuid !== id)]);
    },
    setActive: (id: string | null) => {
      setActiveEncounterId(id);
    },
  } satisfies EncounterState;
}
