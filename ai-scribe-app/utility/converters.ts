import { DraftNote, Encounter, NoteType } from "@/core/types";
import * as WebApiTypes from "@/services/web-api/types";

import { byDate } from "./sorters";
import { setTracking } from "./tracking";

/**
 * Converts a Web API note definition record to an app state
 * {@link NoteType} object.
 */
export function fromWebApiNoteType(record: WebApiTypes.NoteDefinition) {
  return setTracking(record, "Synchronized") as NoteType;
}

/**
 * Converts a Web API encounter record to an app state
 * {@link Encounter} object.
 */
export function fromWebApiEncounter(record: WebApiTypes.Encounter) {
  return setTracking(
    {
      ...record,
      draftNotes: record.draftNotes
        .map((n) => fromWebApiDraftNote(n))
        .sort(byDate((x) => x.createdAt, "Descending")),
    },
    "Synchronized",
  ) as Encounter;
}

/**
 * Converts a Web API draft note record to an app state {@link DraftNote}
 * object.
 */
export function fromWebApiDraftNote(record: WebApiTypes.DraftNote) {
  return setTracking(record, "Synchronized") as DraftNote;
}
