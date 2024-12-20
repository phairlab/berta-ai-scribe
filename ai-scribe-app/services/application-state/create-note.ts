import { DraftNote, IncompleteNoteType, NoteType } from "@/core/types";
import { RequiredFields } from "@/utility/typing";

export function createNote(
  noteType: NoteType | RequiredFields<IncompleteNoteType, "instructions">,
  noteId: string,
  content: string,
): DraftNote {
  const note: DraftNote = {
    id: noteId,
    definitionId: noteType.id,
    created: new Date().toISOString(),
    title: noteType.title ?? "(Untitled Note Type)",
    content: content,
    outputType: noteType.outputType,
    isFlagged: false,
    comments: null,
  };

  return note;
}
