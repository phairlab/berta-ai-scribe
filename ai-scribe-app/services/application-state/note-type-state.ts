import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { NoteType } from "@/core/types";
import { alphabetically } from "@/utility/sorters";

import { LoadingStatus } from "./application-state-context";

type Setter<T> = Dispatch<SetStateAction<T>>;

export type NoteTypeState = {
  status: LoadingStatus;
  list: NoteType[];
  default: NoteType | null;
  exists: (id: string) => boolean;
  get: (id: string) => NoteType | undefined;
  put: (data: NoteType) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
};

export function useNoteTypeState(
  status: LoadingStatus,
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
    const id = defaultNoteTypeId;

    if (defaultNoteType) {
      setDefaultNoteType(noteTypes.find((nt) => nt.uuid === id) ?? null);
    } else {
      setDefaultNoteType(null);
    }
  }, [defaultNoteTypeId]);

  // Synch the default note type to changes in state.
  useEffect(() => {
    if (defaultNoteType) {
      setDefaultNoteType(
        noteTypes.find((nt) => nt.uuid === defaultNoteType.uuid) ?? null,
      );
    }
  }, [noteTypes]);

  return {
    status: status,
    list: noteTypes,
    default: defaultNoteType,
    exists: (id: string) => noteTypes.some((nt) => nt.uuid === id),
    get: (id: string) => noteTypes.find((nt) => nt.uuid === id),
    put: (data: NoteType) => {
      setNoteTypes((noteTypes) =>
        [...noteTypes.filter((nt) => nt.uuid !== data.uuid), data].sort(
          alphabetically((x) => x.title),
        ),
      );
    },
    remove: (id: string) => {
      setNoteTypes((noteTypes) => [
        ...noteTypes.filter((nt) => nt.uuid !== id),
      ]);
    },
    setDefault: (id: string | null) => {
      setDefaultNoteTypeId(id);
    },
  } satisfies NoteTypeState;
}
