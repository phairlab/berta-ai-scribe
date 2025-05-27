import * as WebApiTypes from "@/services/web-api/types";
import { ApplicationError } from "@/utility/errors";
import { OptionalFields } from "@/utility/typing";

export type ScribeActionType =
  | "Saving"
  | "Transcribing"
  | "Generating Note"
  | "Regenerating Notes";

export type ScribeAction = {
  type: ScribeActionType;
  detail?: string;
  abort?: () => void;
};

export type ScribeError = {
  type: ScribeActionType;
  cause: ApplicationError;
  canDismiss: boolean;
  retry: (() => void) | null;
};

export type ScribeOutput =
  | { type: "Transcript" | "Error" }
  | { type: "Note"; id: string | undefined };

export type ScribeTrackedEncounter = {
  noteType?: NoteType;
  action?: ScribeAction;
  error?: ScribeError;
  output?: ScribeOutput;
};

export type AudioSource = {
  id: string;
  title: string | null;
  url: string;
  waveformPeaks: number[] | null;
  duration: number;
};

export type DraftNote = WebApiTypes.DraftNote;

export type Encounter = Omit<WebApiTypes.Encounter, "draftNotes"> & {
  draftNotes: DraftNote[];
  isPersisted: boolean;
};

export type EncountersPage = WebApiTypes.Page<WebApiTypes.Encounter>;

export type IncompleteNoteType = OptionalFields<
  NoteType,
  "instructions" | "title"
>;

export type LanguageModel = WebApiTypes.LanguageModel;

export type LlmManifest = WebApiTypes.LlmManifest;

export type NoteType = WebApiTypes.NoteDefinition & {
  isNew: boolean;
  isSaving: boolean;
  saveError?: ApplicationError;
};

export type Recording = WebApiTypes.Recording;

export type SampleRecording = WebApiTypes.SampleRecording & { id: string };

export type UserInfo = {
  username: string;
  modified: string;
  settings: {
    defaultNoteType?: string;
    enabledNoteTypes?: string[];
    availableLlms: LlmManifest;
  };
};
