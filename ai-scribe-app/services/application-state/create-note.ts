import { DraftNote, EditedNoteType, NoteType } from "@/core/types";
import { setTracking } from "@/utility/tracking";
import { RequiredFields } from "@/utility/typing";

export type ValidNoteType =
  | NoteType
  | RequiredFields<EditedNoteType, "instructions">;

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
    },
    "Not Persisted",
  );

  return note;
}
