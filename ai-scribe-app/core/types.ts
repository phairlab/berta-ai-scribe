import * as WebApiTypes from "@/services/web-api/types";
import { WithTracking } from "@/utility/tracking";
import { OptionalFields } from "@/utility/typing";

export type UserInfo = WebApiTypes.UserInfo;

export type SampleRecording = WebApiTypes.SampleRecording & { id: string };

export type NoteType = WithTracking<WebApiTypes.NoteDefinition>;
export type EditedNoteType = OptionalFields<NoteType, "instructions" | "title">;

export type EncounterDataPage = WebApiTypes.DataPage<WebApiTypes.Encounter>;
export type Encounter = WithTracking<
  Omit<WebApiTypes.Encounter, "draftNotes"> & {
    draftNotes: DraftNote[];
    unsavedAudio?: File;
  }
>;

export type Recording = WebApiTypes.Recording;

export type DraftNote = WithTracking<WebApiTypes.DraftNote>;

export type AudioSource = {
  id: string;
  title: string | null;
  url: string;
  waveformPeaks: number[] | null;
  duration: number;
};
