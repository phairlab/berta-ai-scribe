import { Encounter } from "@/core/types";
import { setTracking } from "@/utility/tracking";

export function createEncounter(fields: {
  tempId: string;
  audio: File;
}): Encounter {
  const created = new Date();
  const encounter: Encounter = setTracking(
    {
      id: fields.tempId,
      created: created.toISOString(),
      modified: created.toISOString(),
      label: null,
      autolabel: null,
      draftNotes: [],
      unsavedAudio: fields.audio,
    },
    "Not Persisted",
  ) satisfies Encounter;

  return encounter;
}
