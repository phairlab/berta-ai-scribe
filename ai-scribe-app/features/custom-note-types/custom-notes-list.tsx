import { IncompleteNoteType, NoteType } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useNoteTypes } from "@/services/application-state/use-note-types";

import { CustomNotesListItem } from "./custom-notes-list-item";

type CustomNotesListProps = {
  editedNoteType: IncompleteNoteType | null;
  onEdit: (noteType: NoteType) => void;
  onDelete: (noteType: NoteType) => void;
};

export const CustomNotesList = ({
  editedNoteType,
  onEdit,
  onDelete,
}: CustomNotesListProps) => {
  const noteTypes = useNoteTypes();

  const handleDelete = (noteType: NoteType) => {
    noteTypes.discard(noteType);
    onDelete(noteType);
  };

  return (
    <div className="flex flex-col gap-3 max-w-[90%] sm:max-w-[600px]">
      {!noteTypes.isReady ? (
        <WaitMessageSpinner size="sm">Loading</WaitMessageSpinner>
      ) : (
        noteTypes.custom.map((noteType) => (
          <CustomNotesListItem
            key={noteType.id}
            canDelete={noteTypes.check.canDiscard(noteType)}
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
