import { DraftNote, IncompleteNoteType, NoteType } from "@/core/types";
import { setTracking } from "@/utility/tracking";
import { RequiredFields } from "@/utility/typing";

export type ValidNoteType =
  | NoteType
  | RequiredFields<IncompleteNoteType, "instructions">;

export function createNote(fields: {
  noteType: ValidNoteType;
  noteId: string;
  content: string;
}): DraftNote {
  const note: DraftNote = setTracking(
    {
      id: fields.noteId,
      definitionId: fields.noteType.id,
      created: new Date().toISOString(),
      title: fields.noteType.title ?? "(Untitled Note Type)",
      content: fields.content,
      outputType: fields.noteType.outputType,
      isFlagged: false,
      comments: null,
    },
    "Not Persisted",
  );

  return note;
}
