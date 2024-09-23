import { useContext, useState } from "react";
import { Select, SelectItem, SelectSection } from "@nextui-org/select";
import { Button } from "@nextui-org/button";

import { NoteDefinition } from "@/models";
import { NoteDefinitionsContext } from "@/contexts/note-definitions-context";
import { sortDefinitionsByTitle } from "@/utility/display";

type AIScribeControlsProps = {
  selectedNoteType?: NoteDefinition;
  isDisabled: boolean;
  onNoteTypeChanged: (noteType: NoteDefinition) => void;
  onSubmit: () => void;
};

export const AIScribeControls = (props: AIScribeControlsProps) => {
  const { noteDefinitions } = useContext(NoteDefinitionsContext);

  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [canCloseSelect, setCanCloseSelect] = useState(false);

  return (
    <div className="flex flex-col md:flex-row items-end md:items-center justify-center gap-4">
      <Select
        aria-label="Select a Note Type"
        className="flex-none w-[300px] max-w-full"
        disallowEmptySelection={true}
        isOpen={isSelectOpen}
        placeholder="Make a Selection"
        selectedKeys={
          props.selectedNoteType ? [props.selectedNoteType.uuid] : undefined
        }
        selectionMode="single"
        size="md"
        onChange={(e) => {
          props.onNoteTypeChanged(
            noteDefinitions?.find(
              (noteType) => noteType.uuid === e.target.value,
            )!,
          );
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
        <SelectSection
          className={noteDefinitions.some((d) => !d.isBuiltin) ? "" : "hidden"}
          title="Custom Note Types"
        >
          {noteDefinitions
            .filter((d) => !d.isBuiltin)
            .sort(sortDefinitionsByTitle)
            .map((noteType) => (
              <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
            ))}
        </SelectSection>
        <SelectSection
          title={
            noteDefinitions.some((d) => !d.isBuiltin)
              ? "Built-in Note Types"
              : undefined
          }
        >
          {noteDefinitions
            .filter((d) => d.isBuiltin)
            .sort(sortDefinitionsByTitle)
            .map((noteType) => (
              <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
            ))}
        </SelectSection>
      </Select>
      <Button
        className="flex-none"
        color="primary"
        isDisabled={!props.isDisabled}
        size="md"
        onClick={() => props.onSubmit()}
      >
        Generate Note
      </Button>
    </div>
  );
};
