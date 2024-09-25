import { useContext, useEffect, useState } from "react";

import { NoteDefinitionsContext } from "@/contexts/note-definitions-context";
import { NoteDefinition } from "@/models";

import { useSession } from "./use-session";

export function useDefaultNoteDefinition() {
  const session = useSession();
  const { noteDefinitions, setNoteDefinitions } = useContext(
    NoteDefinitionsContext,
  );
  const [defaultNoteDefinition, setDefaultNoteDefinition] =
    useState<NoteDefinition>();

  const updateDefault = (definition: NoteDefinition | undefined) => {
    if (definition) {
      setNoteDefinitions(
        noteDefinitions.map((d) => ({
          ...d,
          isDefault: d.uuid == definition.uuid,
        })),
      );
    }
  };

  const reportDefault = () => {
    if (noteDefinitions.length == 0) {
      setDefaultNoteDefinition(undefined);
    } else {
      setDefaultNoteDefinition(
        noteDefinitions.find((noteDefinition) => noteDefinition.isDefault) ??
          noteDefinitions[0],
      );
    }
  };

  useEffect(() => {
    reportDefault();
  }, [noteDefinitions]);

  useEffect(() => {
    if (session.defaultNoteType) {
      const definition = noteDefinitions.find(
        (d) => d.uuid == session.defaultNoteType,
      );

      if (definition) {
        setDefaultNoteDefinition(definition);
      }
    }
  }, [session]);

  return { defaultNoteDefinition, setDefaultNoteDefinition: updateDefault };
}
