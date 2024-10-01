import { useState } from "react";

import clsx from "clsx";

import { Select, SelectItem, SelectSection } from "@nextui-org/select";

import { sortDefinitionsByTitle } from "@/utility/sorters";

import { NoteDefinition } from "./note-definition";

type NoteTypeSelectorProps = {
  noteTypes: NoteDefinition[];
  selected: NoteDefinition | undefined;
  isLoading: boolean;
  onChange: (noteType: NoteDefinition | undefined) => void;
};

export const NoteTypeSelector = ({
  noteTypes,
  selected,
  isLoading,
  onChange,
}: NoteTypeSelectorProps) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [canCloseSelect, setCanCloseSelect] = useState(false);

  const hasCustomNotes = (): boolean => noteTypes.some((t) => !t.isBuiltin);

  return (
    <Select
      aria-label="Select a Note Type"
      className="flex-none w-[300px] max-w-full"
      disallowEmptySelection={true}
      isDisabled={isLoading}
      isLoading={isLoading}
      isOpen={isSelectOpen}
      placeholder="Select a Note Type"
      selectedKeys={selected ? [selected.uuid] : undefined}
      selectionMode="single"
      size="md"
      onChange={(e) => {
        onChange(noteTypes.find((t) => t.uuid == e.target.value));
        setIsSelectOpen(false);
        setCanCloseSelect(false);
      }}
      // Fix for NextUI Select/Popover bug on some mobile browsers.
      onOpenChange={(open) => {
        if (open) {
          setIsSelectOpen(true);
          setTimeout(() => setCanCloseSelect(true), 500);
        } else if (canCloseSelect) {
          setIsSelectOpen(false);
          setCanCloseSelect(false);
        }
      }}
    >
      <SelectSection
        className={clsx({ hidden: !hasCustomNotes() })}
        title="Custom Note Types"
      >
        {noteTypes
          .filter((t) => !t.isBuiltin)
          .sort(sortDefinitionsByTitle)
          .map((noteType) => (
            <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
          ))}
      </SelectSection>
      <SelectSection
        title={hasCustomNotes() ? "Built-in Note Types" : undefined}
      >
        {noteTypes
          .filter((t) => t.isBuiltin)
          .sort(sortDefinitionsByTitle)
          .map((noteType) => (
            <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
          ))}
      </SelectSection>
    </Select>
  );
};
