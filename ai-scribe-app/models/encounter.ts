import { DraftNote } from "./draft-note";
import { Recording } from "./recording";

export type Encounter = {
  uuid?: string;
  newId?: string;
  createdAt: Date;
  title?: string;
  recording: Recording;
  draftNotes: DraftNote[];
  isUnsaved?: boolean;
  isNew?: boolean;
};
