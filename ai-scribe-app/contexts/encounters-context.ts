import { createContext } from "react";

import { Encounter } from "@/models";

export const EncountersContext = createContext({
  encounters: [] as Encounter[],
  setEncounters: (() => {}) as (encounters: Encounter[]) => void,
});
