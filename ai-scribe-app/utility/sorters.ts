import { DraftNote } from "@/services/note-generation/draft-note";

import { Encounter } from "@/features/encounters/encounter";
import { NoteDefinition } from "@/features/note-types/note-definition";

export function sortEncountersByDate(a: Encounter, b: Encounter): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortNotesByDate(a: DraftNote, b: DraftNote): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortDefinitionsByTitle(
  a: NoteDefinition,
  b: NoteDefinition,
): number {
  if (a.title > b.title) {
    return -1;
  } else if (a.title === b.title) {
    return 0;
  } else {
    return 1;
  }
}
