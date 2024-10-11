import * as WebApiTypes from "@/services/web-api/types";
import { WithTracking } from "@/utility/tracking";
import { OptionalFields } from "@/utility/typing";

export type SampleRecording = WebApiTypes.SampleRecording;

export type NoteType = WithTracking<WebApiTypes.NoteDefinition>;
export type EditedNoteType = OptionalFields<NoteType, "instructions" | "title">;

export type Encounter = WithTracking<
  Omit<WebApiTypes.Encounter, "recording" | "draftNotes"> & {
    recording: Recording;
    draftNotes: DraftNote[];
  }
>;

export type Recording = WebApiTypes.Recording & { cachedAudio?: File };

export type DraftNote = WithTracking<WebApiTypes.DraftNote>;
