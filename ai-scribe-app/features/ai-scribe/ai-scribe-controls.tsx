import { Button } from "@nextui-org/button";

import { NoteTypeSelector } from "@/core/note-type-selector";
import { NoteType } from "@/core/types";
import { useNoteTypes } from "@/services/application-state/note-types-context";

type AIScribeControlsProps = {
  isDisabled: boolean;
  isRegenerate: boolean;
  selectedNoteType?: NoteType;
  onNoteTypeChanged: (noteType: NoteType | undefined) => void;
  onSubmit: () => void;
};

export const AIScribeControls = ({
  isDisabled,
  isRegenerate,
  selectedNoteType,
  onNoteTypeChanged,
  onSubmit,
}: AIScribeControlsProps) => {
  const noteTypes = useNoteTypes();

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex flex-col md:flex-row items-end md:items-center md:justify-center gap-4">
        <NoteTypeSelector
          builtinTypes={noteTypes.builtin}
          className="w-[300px]"
          customTypes={noteTypes.custom}
          isDisabled={noteTypes.initState !== "Ready"}
          isLoading={noteTypes.initState === "Initializing"}
          placeholder="Select a Note Type"
          selected={selectedNoteType}
          onChange={onNoteTypeChanged}
        />
        <Button
          color="primary"
          isDisabled={isDisabled}
          size="md"
          onClick={onSubmit}
        >
          {isRegenerate ? "Regenerate Note" : "Generate Note"}
        </Button>
      </div>
    </div>
  );
};
