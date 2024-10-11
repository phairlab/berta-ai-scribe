import { createContext } from "react";

import { EncounterState } from "./encounter-state";
import { NoteTypeState } from "./note-type-state";
import { SampleRecordingState } from "./sample-recording-state";

export type LoadingStatus = "Uninitialized" | "Loading" | "Ready" | "Failed";

export type ApplicationState = {
  sampleRecordings: SampleRecordingState;
  noteTypes: NoteTypeState;
  encounters: EncounterState;
};

const nullSampleRecordingState: SampleRecordingState = {
  status: "Uninitialized",
  list: [],
};

const nullNoteTypeState: NoteTypeState = {
  status: "Uninitialized",
  list: [],
  default: null,
  exists: () => false,
  get: () => void {},
  put: () => void {},
  remove: () => void {},
  setDefault: () => void {},
};

const nullEncounterState: EncounterState = {
  status: "Uninitialized",
  list: [],
  activeEncounter: null,
  exists: () => false,
  get: () => void {},
  put: () => void {},
  remove: () => void {},
  setActive: () => void {},
};

export const ApplicationStateContext = createContext<ApplicationState>({
  sampleRecordings: nullSampleRecordingState,
  noteTypes: nullNoteTypeState,
  encounters: nullEncounterState,
});
