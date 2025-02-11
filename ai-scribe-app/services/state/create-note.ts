import { DraftNote, IncompleteNoteType, NoteType } from "@/core/types";
import { RequiredFields } from "@/utility/typing";

import { FALLBACK_RECOMMENDED_MODEL } from "./user-info-context";

export function createNote(
  noteType: NoteType | RequiredFields<IncompleteNoteType, "instructions">,
  noteId: string,
  content: string,
  model: string = FALLBACK_RECOMMENDED_MODEL.name,
): DraftNote {
  const note: DraftNote = {
    id: noteId,
    definitionId: noteType.id,
    created: new Date().toISOString(),
    title: noteType.title ?? "(Untitled Note Type)",
    model: model,
    content: content,
    outputType: noteType.outputType,
    isFlagged: false,
    comments: null,
  };

  return note;
}
