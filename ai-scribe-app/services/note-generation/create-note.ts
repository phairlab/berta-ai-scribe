import { DraftNote, EditedNoteType, NoteType } from "@/core/types";
import { setTracking } from "@/utility/tracking";
import { RequiredFields } from "@/utility/typing";

export type ValidNoteType =
  | NoteType
  | RequiredFields<EditedNoteType, "instructions">;

export function createNote(fields: {
  noteType: ValidNoteType;
  tag: string;
  text: string;
}): DraftNote {
  const note: DraftNote = setTracking(
    {
      tag: fields.tag,
      noteDefinitionUuid: fields.noteType.uuid,
      createdAt: new Date(),
      title: fields.noteType.title ?? "(Untitled Note Type)",
      text: fields.text,
      generationService: "Snowflake Cortex",
      model: "",
      timeToGenerate: 0,
      isDiscarded: false,
    },
    "Not Persisted",
  );

  return note;
}
