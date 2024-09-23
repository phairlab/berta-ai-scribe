import { createContext } from "react";

import { NoteDefinition } from "@/models";

export const NoteDefinitionsContext = createContext({
  noteDefinitions: [] as NoteDefinition[],
  setNoteDefinitions: (() => {}) as (noteDefinitions: NoteDefinition[]) => void,
});
