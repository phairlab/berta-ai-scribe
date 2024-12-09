import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { Encounter, EncountersPage } from "@/core/types";
import { convertWebApiRecord } from "@/utility/conversion";
import { byDate } from "@/utility/sorting";

import { InitializationState } from "./application-state-context";

type Setter<T> = Dispatch<SetStateAction<T>>;
export type EncounterLoadState =
  | "Fetching More"
  | "Partially Fetched"
  | "All Fetched";

export type EncounterState = {
  status: InitializationState;
  list: Encounter[];
  loadState: EncounterLoadState;
  activeEncounter: Encounter | null;
  exists: (id: string) => boolean;
  get: (id: string) => Encounter | undefined;
  put: (data: Encounter) => void;
  remove: (id: string) => void;
  setPageLoading: () => void;
  loadPage: (page: EncountersPage) => void;
  setActive: (id: string | null) => void;
};

export function useEncounterState(
  status: InitializationState,
  encounters: Encounter[],
  loadState: EncounterLoadState,
  activeEncounter: Encounter | null,
  setEncounters: Setter<Encounter[]>,
  setLoadState: Setter<EncounterLoadState>,
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
    loadState: loadState,
    activeEncounter: activeEncounter,
    exists: (id: string) => encounters.some((e) => e.id === id),
    get: (id: string) => encounters.find((e) => e.id === id),
    put: (data: Encounter) => {
      setEncounters((encounters) =>
        [...encounters.filter((e) => e.id !== data.id), data].sort(
          byDate((x) => new Date(x.created), "Descending"),
        ),
      );
    },
    remove: (id: string) => {
      setEncounters((encounters) => [...encounters.filter((e) => e.id !== id)]);
    },
    setPageLoading: () => {
      setLoadState("Fetching More");
    },
    loadPage: (page: EncountersPage) => {
      const moreEncounters: Encounter[] = page.data
        .sort(byDate((x) => new Date(x.created), "Descending"))
        .map((record) => convertWebApiRecord.toEncounter(record));

      setEncounters((encounters) =>
        [...encounters, ...moreEncounters].sort(
          byDate((x) => new Date(x.created), "Descending"),
        ),
      );
      setTimeout(
        () =>
          setLoadState(page.isLastPage ? "All Fetched" : "Partially Fetched"),
        0,
      );
    },
    setActive: (id: string | null) => {
      setActiveEncounterId(id);
    },
  } satisfies EncounterState;
}
