import { marked } from "marked";

import * as UiTypes from "@/core/types";
import * as WebApiTypes from "@/services/web-api/types";

import { byDate } from "./sorting";

// WEB API --> UI TYPE CONVERSION

function toNote(record: WebApiTypes.DraftNote) {
  return record satisfies UiTypes.DraftNote as UiTypes.DraftNote;
}

function toEncounter(record: WebApiTypes.Encounter) {
  return {
    ...record,
    draftNotes: record.draftNotes
      .map((n) => toNote(n))
      .sort(byDate((x) => new Date(x.created), "Descending")),
    isPersisted: true,
  } satisfies UiTypes.Encounter as UiTypes.Encounter;
}

function toNoteType(record: WebApiTypes.NoteDefinition) {
  return {
    ...record,
    isNew: false,
    isSaving: false,
  } satisfies UiTypes.NoteType as UiTypes.NoteType;
}

function toSampleRecording(
  record: WebApiTypes.SampleRecording,
): UiTypes.SampleRecording {
  return { id: record.filename, ...record };
}

function toUserInfo(record: WebApiTypes.UserInfo): UiTypes.UserInfo {
  return {
    username: record.username,
    modified: record.updated,
    settings: {
      defaultNoteType: record.defaultNoteType,
      availableLlms: record.availableLlms,
    },
  };
}

export const convertWebApiRecord = {
  toNote,
  toEncounter,
  toNoteType,
  toSampleRecording,
  toUserInfo,
};

// MARKDOWN CONVERSION

function plainTextRenderer() {
  const render = new marked.Renderer();

  render.blockquote = ({ tokens }) =>
    `"${tokens.map((t) => t.raw).join("")}"\n`;

  render.br = () => "\n";

  render.checkbox = ({ checked }) => `[${checked ? "X" : " "}]`;

  render.code = ({ text }) => `\`\`\`\n${text}\n\`\`\``;

  render.codespan = ({ text }) => `\`${text}\``;

  render.em = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.em = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.heading = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}\n`;

  render.hr = () => "";

  render.html = () => "";

  render.image = ({ href, title, text }) =>
    `Image: ${text} [${title} (${href})]`;

  render.link = ({ href, title }) => `[${title}](${href})`;

  render.list = (token) =>
    token.items
      .map(
        (item, index) =>
          `${token.ordered ? `${index + 1}.` : "-"} ${item.text}`,
      )
      .join("\n") + "\n\n";

  render.listitem = (item) => ` - ${item.text}`;

  render.paragraph = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}\n\n`;

  render.strong = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.table = (token) => token.raw;

  render.text = (token) => token.text;

  return render;
}

/** Converts a markdown string to equivalent plain text. */
function toPlainText(markdown: string) {
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

export const convertMarkdown = { toPlainText };
