import { marked } from "marked";

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
        .sort(byDate((x) => x.created, "Descending")),
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

function plainTextMarkdownRenderer() {
  const render = new marked.Renderer();

  render.link = ({ href, title }) => `Link: [${title} (${href})]`;

  render.paragraph = ({ tokens }) => `${tokens.map((t) => t.raw).join()}\n`;

  render.heading = ({ tokens }) => `\n${tokens.map((t) => t.raw).join()}\n`;

  render.list = (token) =>
    token.items
      .map((item, index) => `${token.ordered ? index + 1 : "-"} ${item.text}`)
      .join("\n") + "\n";

  render.em = ({ tokens }) => `${tokens.map((t) => t.raw).join()}\n`;
  render.strong = ({ tokens }) => `${tokens.map((t) => t.raw).join()}\n`;

  render.br = () => "\n";

  return render;
}

/** Converts a markdown string to equivalent plain text. */
export function toPlainTextFromMarkdown(markdown: string) {
  const plainText = marked(markdown, {
    renderer: plainTextMarkdownRenderer(),
  }) as string;

  return plainText
    .trim()
    .replace(/\\[\\`*_{}\[\]<>()#+-.!|]/g, (escaped) => escaped.substring(1))
    .replace(/\n{3}/g, "\n\n");
}
