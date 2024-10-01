import { createContext } from "react";

import { Encounter } from "@/features/encounters/encounter";
import { NoteDefinition } from "@/features/note-types/note-definition";
import { SampleRecording } from "@/features/sample-recordings/sample-recording";

type StateSlice<T> = {
  state: T;
  set: (state: T) => void;
};

type PrefetchedStateSlice<T> = StateSlice<T> & { isFetched: boolean };

export type ApplicationState = {
  encounters: PrefetchedStateSlice<Encounter[]>;
  noteTypes: PrefetchedStateSlice<NoteDefinition[]>;
  sampleRecordings: PrefetchedStateSlice<SampleRecording[]>;
  activeEncounter: StateSlice<Encounter | null>;
  defaultNoteType: StateSlice<NoteDefinition | null>;
};

function noState<T>(placeholder: T) {
  return { state: placeholder, set: () => void {} };
}

function noPrefetchedState<T>(placeholder: T) {
  return { ...noState(placeholder), isFetched: false };
}

export const ApplicationStateContext = createContext<ApplicationState>({
  encounters: noPrefetchedState([]),
  noteTypes: noPrefetchedState([]),
  sampleRecordings: noPrefetchedState([]),
  activeEncounter: noState(null),
  defaultNoteType: noState(null),
});
