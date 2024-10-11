import { Button } from "@nextui-org/button";

import { NoteType } from "@/core/types";

import { NoteTypeSelector } from "@/features/note-types/note-type-selector";
import { useNoteTypes } from "@/features/note-types/use-note-types";

type AIScribeControlsProps = {
  selectedNoteType?: NoteType;
  isDisabled: boolean;
  onNoteTypeChanged: (noteType: NoteType | undefined) => void;
  onSubmit: () => void;
};

export const AIScribeControls = ({
  selectedNoteType,
  isDisabled,
  onNoteTypeChanged,
  onSubmit,
}: AIScribeControlsProps) => {
  const noteTypes = useNoteTypes();

  return (
    <div className="flex flex-col md:flex-row items-end md:items-center justify-center gap-4">
      <NoteTypeSelector
        builtinTypes={noteTypes.builtin}
        customTypes={noteTypes.custom}
        isLoading={!noteTypes.isReady}
        placeholder="Select a Note Type"
        selected={selectedNoteType}
        onChange={onNoteTypeChanged}
      />
      <Button
        className="flex-none"
        color="primary"
        isDisabled={isDisabled}
        size="md"
        onClick={() => onSubmit()}
      >
        Generate Note
      </Button>
    </div>
  );
};
