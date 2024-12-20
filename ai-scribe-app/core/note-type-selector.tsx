import { ReactNode } from "react";

import clsx from "clsx";

import { SelectItem, SelectSection } from "@nextui-org/select";

import { MobileCompatibleSelect } from "@/core/mobile-compatible-select";
import { NoteType } from "@/core/types";

type NoteTypeSelectorProps = {
  className?: string;
  builtinTypes: NoteType[];
  customTypes: NoteType[];
  selected: NoteType | undefined;
  label?: ReactNode;
  labelPlacement?: "outside" | "outside-left" | "inside" | undefined;
  placeholder?: string | undefined;
  isDisabled: boolean;
  isLoading: boolean;
  onChange: (noteType: NoteType | undefined) => void;
};

export const NoteTypeSelector = ({
  className,
  builtinTypes,
  customTypes,
  selected,
  label,
  labelPlacement,
  placeholder,
  isDisabled,
  isLoading,
  onChange,
}: NoteTypeSelectorProps) => {
  const hasCustomNotes = customTypes.length > 0;

  const persistedNoteTypes = (noteTypes: NoteType[]) =>
    noteTypes.filter((nt) => !nt.isNew);

  const handleChange = (key: string) => {
    const noteType =
      customTypes.find((nt) => nt.id === key) ??
      builtinTypes.find((nt) => nt.id === key);

    onChange(noteType);
  };

  return (
    <MobileCompatibleSelect
      aria-label="Select a Note Type"
      className={className}
      disallowEmptySelection={true}
      isDisabled={isDisabled}
      isLoading={isLoading}
      label={label}
      labelPlacement={labelPlacement}
      placeholder={placeholder}
      selectedKeys={selected ? [selected.id] : []}
      selectionMode="single"
      size="md"
      onChange={(e) => handleChange(e.target.value)}
    >
      <SelectSection
        className={clsx({ hidden: !hasCustomNotes })}
        title="Custom Note Types"
      >
        {persistedNoteTypes(customTypes).map((noteType) => (
          <SelectItem key={noteType.id}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
      <SelectSection title={hasCustomNotes ? "Built-in Note Types" : undefined}>
        {persistedNoteTypes(builtinTypes).map((noteType) => (
          <SelectItem key={noteType.id}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
    </MobileCompatibleSelect>
  );
};
