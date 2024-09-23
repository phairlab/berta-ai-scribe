import { useState } from "react";

import { EncountersContext } from "@/contexts/encounters-context";
import { NoteDefinitionsContext } from "@/contexts/note-definitions-context";
import { SampleRecordingsContext } from "@/contexts/sample-recordings-context";
import { ActiveEncounterContext } from "@/contexts/active-encounter-context";
import { AppContextData, Encounter } from "@/models";
import { sortEncountersByDate } from "@/utility/display";

export type AppDataProviderProps = {
  children: React.ReactNode;
  data: AppContextData;
};

export const AppContextDataProvider = (props: AppDataProviderProps) => {
  const [encounters, setEncounters] = useState(
    props.data.encounters.sort(sortEncountersByDate),
  );
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(
    null,
  );
  const [noteDefinitions, setNoteDefinitions] = useState(
    props.data.noteDefinitions,
  );
  const [sampleRecordings, setSampleRecordings] = useState(
    props.data.sampleRecordings,
  );

  return (
    <EncountersContext.Provider value={{ encounters, setEncounters }}>
      <ActiveEncounterContext.Provider
        value={{ activeEncounter, setActiveEncounter }}
      >
        <NoteDefinitionsContext.Provider
          value={{ noteDefinitions, setNoteDefinitions }}
        >
          <SampleRecordingsContext.Provider
            value={{ sampleRecordings, setSampleRecordings }}
          >
            {props.children}
          </SampleRecordingsContext.Provider>
        </NoteDefinitionsContext.Provider>
      </ActiveEncounterContext.Provider>
    </EncountersContext.Provider>
  );
};
