import { Encounter } from "./encounter";
import { NoteDefinition } from "./note-definition";
import { SampleRecording } from "./sample-recording";

export type AppContextData = {
  encounters: Encounter[];
  noteDefinitions: NoteDefinition[];
  sampleRecordings: SampleRecording[];
};
