import { HTMLProps } from "react";

import { IncompleteNoteType, NoteType } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useNoteTypes } from "@/services/state/note-types-context";

import { CustomNotesListItem } from "./custom-notes-list-item";

type CustomNotesListProps = {
  editedNoteType: IncompleteNoteType | null;
  onEdit: (noteType: NoteType) => void;
  onDelete: (noteType: NoteType) => void;
} & HTMLProps<HTMLDivElement>;

export const CustomNotesList = ({
  editedNoteType,
  onEdit,
  onDelete,
  ...props
}: CustomNotesListProps) => {
  const noteTypes = useNoteTypes();

  const handleDelete = (noteType: NoteType) => {
    noteTypes.remove(noteType.id);
    onDelete(noteType);
  };

  return (
    <div {...props}>
      {noteTypes.initState !== "Ready" ? (
        <WaitMessageSpinner size="sm">Loading</WaitMessageSpinner>
      ) : (
        noteTypes.custom.map((noteType) => (
          <CustomNotesListItem
            key={noteType.id}
            canDelete={!noteType.isSaving}
            isBeingEdited={noteType.id === editedNoteType?.id}
            noteType={noteType}
            onDelete={() => handleDelete(noteType)}
            onEdit={() => onEdit(noteType)}
          />
        ))
      )}
    </div>
  );
};
