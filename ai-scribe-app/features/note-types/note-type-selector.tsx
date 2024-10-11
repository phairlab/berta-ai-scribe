import { ReactNode, useState } from "react";

import clsx from "clsx";

import { Select, SelectItem, SelectSection } from "@nextui-org/select";

import { NoteType } from "@/core/types";

type NoteTypeSelectorProps = {
  builtinTypes: NoteType[];
  customTypes: NoteType[];
  selected: NoteType | undefined;
  label?: ReactNode;
  labelPlacement?: "outside" | "outside-left" | "inside" | undefined;
  placeholder?: string | undefined;
  isLoading: boolean;
  onChange: (noteType: NoteType | undefined) => void;
};

export const NoteTypeSelector = ({
  builtinTypes,
  customTypes,
  selected,
  label,
  labelPlacement,
  placeholder,
  isLoading,
  onChange,
}: NoteTypeSelectorProps) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [canCloseSelect, setCanCloseSelect] = useState(false);

  const hasCustomNotes = customTypes.length > 0;

  const persisted = (noteTypes: NoteType[]) =>
    noteTypes.filter((nt) => nt.tracking.isPersisted);

  const find = (id: string) =>
    customTypes.find((nt) => nt.uuid === id) ??
    builtinTypes.find((nt) => nt.uuid === id);

  return (
    <Select
      aria-label="Select a Note Type"
      className="flex-none w-[300px] max-w-full"
      disallowEmptySelection={true}
      isDisabled={isLoading}
      isLoading={isLoading}
      isOpen={isSelectOpen}
      label={label}
      labelPlacement={labelPlacement}
      placeholder={placeholder}
      selectedKeys={selected ? [selected.uuid] : undefined}
      selectionMode="single"
      size="md"
      onChange={(e) => {
        onChange(find(e.target.value));
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
        className={clsx({ hidden: !hasCustomNotes })}
        title="Custom Note Types"
      >
        {persisted(customTypes).map((noteType) => (
          <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
      <SelectSection title={hasCustomNotes ? "Built-in Note Types" : undefined}>
        {persisted(builtinTypes).map((noteType) => (
          <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
    </Select>
  );
};
