import { Encounter } from "@/core/types";

export function createEncounter(tempId: string): Encounter {
  const created = new Date();
  const encounter: Encounter = {
    id: tempId,
    created: created.toISOString(),
    modified: created.toISOString(),
    label: null,
    autolabel: null,
    draftNotes: [],
    isPersisted: false,
  } satisfies Encounter;

  return encounter;
}
