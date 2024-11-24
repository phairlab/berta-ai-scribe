import { Button } from "@nextui-org/button";

import { NoteTypeSelector } from "@/core/note-type-selector";
import { NoteType } from "@/core/types";
import { useNoteTypes } from "@/services/application-state/use-note-types";

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
    <div className="flex flex-col md:flex-row items-end md:items-center md:justify-center gap-4">
      <NoteTypeSelector
        builtinTypes={noteTypes.builtin}
        className="w-[300px]"
        customTypes={noteTypes.custom}
        isLoading={!noteTypes.isReady}
        placeholder="Select a Note Type"
        selected={selectedNoteType}
        onChange={onNoteTypeChanged}
      />
      <Button
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
