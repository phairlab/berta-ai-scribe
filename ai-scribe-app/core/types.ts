import * as WebApiTypes from "@/services/web-api/types";
import { WithTracking } from "@/utility/tracking";
import { OptionalFields } from "@/utility/typing";

export type AudioSource = {
  id: string;
  title: string | null;
  url: string;
  waveformPeaks: number[] | null;
  duration: number;
};

export type DraftNote = WithTracking<WebApiTypes.DraftNote>;

export type Encounter = WithTracking<
  Omit<WebApiTypes.Encounter, "draftNotes"> & {
    draftNotes: DraftNote[];
    unsavedAudio?: File;
  }
>;

export type EncountersPage = WebApiTypes.Page<WebApiTypes.Encounter>;

export type IncompleteNoteType = OptionalFields<
  NoteType,
  "instructions" | "title"
>;

export type NoteType = WithTracking<WebApiTypes.NoteDefinition>;

export type Recording = WebApiTypes.Recording;

export type SampleRecording = WebApiTypes.SampleRecording & { id: string };

export type UserInfo = WebApiTypes.UserInfo;
