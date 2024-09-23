import { useContext } from "react";

import { NoteDefinitionsContext } from "@/contexts/note-definitions-context";

export function useDefaultNoteDefinition() {
  const { noteDefinitions } = useContext(NoteDefinitionsContext);

  if (noteDefinitions.length == 0) {
    return undefined;
  } else {
    return (
      noteDefinitions.find((noteDefinition) => noteDefinition.isDefault) ??
      noteDefinitions[0]
    );
  }
}
