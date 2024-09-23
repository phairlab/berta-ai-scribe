import { Encounter } from "@/models";
import { createContext } from "react";

export const ActiveEncounterContext = createContext({
  activeEncounter: null as Encounter | null,
  setActiveEncounter: (() => {}) as (activeEncounter: Encounter | null) => void,
});
