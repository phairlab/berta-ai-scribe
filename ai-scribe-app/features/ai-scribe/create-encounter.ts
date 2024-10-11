import { Encounter } from "@/core/types";
import { setTracking } from "@/utility/tracking";

export function createEncounter(fields: {
  tempId: string;
  audio: File;
}): Encounter {
  const encounter: Encounter = setTracking(
    {
      uuid: fields.tempId,
      createdAt: new Date(),
      recording: {
        filename: fields.audio.name,
        mediaType: fields.audio.type,
        cachedAudio: fields.audio,
      },
      draftNotes: [],
    },
    "Not Persisted",
  ) satisfies Encounter;

  return encounter;
}
