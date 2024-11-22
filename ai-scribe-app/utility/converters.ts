import { marked } from "marked";

import { DraftNote, Encounter, NoteType } from "@/core/types";
import * as WebApiTypes from "@/services/web-api/types";

import { plainTextRenderer } from "./markdown";
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
        .sort(byDate((x) => new Date(x.created), "Descending")),
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

/** Converts a markdown string to equivalent plain text. */
export function fromMarkdownToPlainText(markdown: string) {
  const plainText = marked(markdown, {
    renderer: plainTextRenderer(),
  }) as string;

  return plainText
    .replace(/(_+)(.*)\1/g, "$2") // Remove balanced underline pairs
    .replace(/(\*+)(.*)\1/g, "$2") // Remove balanced asterisk pairs
    .replace(/\<(.+)( .+)?\>(.*)\<\/\1\>/g, "$3") // Remove HTML tag pairs
    .replace(/\<(.+ )\/\>/g, "") // Remove HTML singleton tags
    .replace(/\\([\\`*_{}\[\]<>()#+-.!|])/g, "$1") // Unescape special characters
    .replace(/\n+\n\n/g, "\n\n") // Condense multi-row blank lines
    .replace(/\n\n(- .*)/g, "\n$1") // Remove blank lines before bullet lists
    .replace(/\n\n(1\. .*)/g, "\n$1") // Remove blank lines before numeric lists
    .trim();
}
