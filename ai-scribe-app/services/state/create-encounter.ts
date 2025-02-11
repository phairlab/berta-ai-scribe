import { Encounter } from "@/core/types";

export function createEncounter(tempId: string, context?: string): Encounter {
  const created = new Date();
  const encounter: Encounter = {
    id: tempId,
    created: created.toISOString(),
    modified: created.toISOString(),
    label: null,
    autolabel: null,
    context: context ?? null,
    draftNotes: [],
    isPersisted: false,
  } satisfies Encounter;

  return encounter;
}
