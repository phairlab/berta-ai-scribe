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
      created: created,
      modified: created,
      draftNotes: [],
    },
    "Not Persisted",
  ) satisfies Encounter;

  return encounter;
}
