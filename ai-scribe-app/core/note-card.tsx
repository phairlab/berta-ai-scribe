import { MarkdownNoteCard } from "./markdown-note-card";
import { PlainTextNoteCard } from "./plain-text-note-card";
import { DraftNote } from "./types";

type NoteCardProps = {
  note: DraftNote;
  showRawOutput?: boolean;
  canFlag?: boolean;
};

export const NoteCard = (props: NoteCardProps) =>
  props.note.outputType === "Markdown" ? (
    <MarkdownNoteCard {...props} />
  ) : (
    <PlainTextNoteCard {...props} />
  );
