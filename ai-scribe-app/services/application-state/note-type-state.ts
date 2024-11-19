import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { NoteType } from "@/core/types";
import { alphabetically } from "@/utility/sorters";

import { InitializationState } from "./application-state-context";

type Setter<T> = Dispatch<SetStateAction<T>>;

export type NoteTypeState = {
  status: InitializationState;
  list: NoteType[];
  default: NoteType | null;
  exists: (id: string) => boolean;
  get: (id: string) => NoteType | undefined;
  put: (data: NoteType) => void;
  remove: (id: string) => void;
  setDefault: (id: string | null) => void;
};

export function useNoteTypeState(
  status: InitializationState,
  noteTypes: NoteType[],
  defaultNoteType: NoteType | null,
  setNoteTypes: Setter<NoteType[]>,
  setDefaultNoteType: Setter<NoteType | null>,
) {
  const [defaultNoteTypeId, setDefaultNoteTypeId] = useState<string | null>(
    null,
  );

  // Set the default note type on the next render.
  // This allows it to be set at the same time as the note type is added
  // and still find it in the list.
  useEffect(() => {
    if (defaultNoteTypeId !== defaultNoteType?.id) {
      const id = defaultNoteTypeId;

      if (defaultNoteType) {
        setDefaultNoteType(noteTypes.find((nt) => nt.id === id) ?? null);
      } else {
        setDefaultNoteType(null);
      }
    }
  }, [defaultNoteTypeId]);

  // Synch the default note type to changes in state.
  useEffect(() => {
    if (defaultNoteType) {
      setDefaultNoteType(
        noteTypes.find((nt) => nt.id === defaultNoteType.id) ?? null,
      );
    }
  }, [noteTypes]);

  return {
    status: status,
    list: noteTypes,
    default: defaultNoteType,
    exists: (id: string) => noteTypes.some((nt) => nt.id === id),
    get: (id: string) => noteTypes.find((nt) => nt.id === id),
    put: (data: NoteType) => {
      setNoteTypes((noteTypes) =>
        [...noteTypes.filter((nt) => nt.id !== data.id), data].sort(
          alphabetically((x) => x.title),
        ),
      );
    },
    remove: (id: string) => {
      setNoteTypes((noteTypes) => [...noteTypes.filter((nt) => nt.id !== id)]);

      // Handle case where the user default was just removed.
      // Must be updated immediately to ensure previous is not searched in list.
      if (defaultNoteType && defaultNoteType.id === id) {
        if (noteTypes.length > 0) {
          const builtinDefault = noteTypes.find((d) => d.isSystemDefault);
          const fallbackDefault = noteTypes[0];

          setDefaultNoteTypeId(builtinDefault?.id ?? fallbackDefault.id);
          setDefaultNoteType(builtinDefault ?? fallbackDefault);
        } else {
          setDefaultNoteTypeId(null);
          setDefaultNoteType(null);
        }
      }
    },
    setDefault: (id: string | null) => {
      setDefaultNoteTypeId(id);
    },
  } satisfies NoteTypeState;
}
