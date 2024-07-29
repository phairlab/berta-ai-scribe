import { useState } from "react";
import { Select, SelectItem } from "@nextui-org/select";
import { Button } from "@nextui-org/button";

type AIScribeControlsProps = {
  noteTypes: string[];
  selectedNoteType: string;
  canSubmit: boolean;
  onNoteTypeChanged: (noteType: string) => void;
  onSubmit: () => void;
};

export const AIScribeControls = (props: AIScribeControlsProps) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [canCloseSelect, setCanCloseSelect] = useState(false);

  return (
    <div className="flex flex-row items-center justify-center gap-4">
      <Select
        aria-label="Select a Note Type"
        className="flex-none w-40"
        disallowEmptySelection={true}
        isOpen={isSelectOpen}
        placeholder="Make a Selection"
        selectedKeys={[props.selectedNoteType]}
        selectionMode="single"
        size="md"
        onChange={(e) => {
          props.onNoteTypeChanged(e.target.value);
          setIsSelectOpen(false);
          setCanCloseSelect(false);
        }}
        onOpenChange={(open) => {
          if (open) {
            setIsSelectOpen(true);
            setTimeout(() => setCanCloseSelect(true), 500); // Fix for NextUI Select/Popover bug on some mobile browsers.
          } else if (canCloseSelect) {
            setIsSelectOpen(false);
            setCanCloseSelect(false);
          }
        }}
      >
        {props.noteTypes.map((type) => (
          <SelectItem key={type}>{type}</SelectItem>
        ))}
      </Select>
      <Button
        className="flex-none"
        color="primary"
        isDisabled={!props.canSubmit}
        size="md"
        onClick={() => props.onSubmit()}
      >
        Generate Note
      </Button>
    </div>
  );
};
