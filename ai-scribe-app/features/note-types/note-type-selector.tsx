import { ReactNode } from "react";

import clsx from "clsx";

import { SelectItem, SelectSection } from "@nextui-org/select";

import { SafeSelect } from "@/core/safe-select";
import { NoteType } from "@/core/types";

type NoteTypeSelectorProps = {
  className?: string;
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
  className,
  builtinTypes,
  customTypes,
  selected,
  label,
  labelPlacement,
  placeholder,
  isLoading,
  onChange,
}: NoteTypeSelectorProps) => {
  const hasCustomNotes = customTypes.length > 0;

  const persistedNoteTypes = (noteTypes: NoteType[]) =>
    noteTypes.filter((nt) => nt.tracking.isPersisted);

  const handleChange = (key: string) => {
    const noteType =
      customTypes.find((nt) => nt.uuid === key) ??
      builtinTypes.find((nt) => nt.uuid === key);

    onChange(noteType);
  };

  return (
    <SafeSelect
      aria-label="Select a Note Type"
      className={className}
      disallowEmptySelection={true}
      isDisabled={isLoading}
      isLoading={isLoading}
      label={label}
      labelPlacement={labelPlacement}
      placeholder={placeholder}
      selectedKeys={selected ? [selected.uuid] : []}
      selectionMode="single"
      size="md"
      onChange={(e) => handleChange(e.target.value)}
    >
      <SelectSection
        className={clsx({ hidden: !hasCustomNotes })}
        title="Custom Note Types"
      >
        {persistedNoteTypes(customTypes).map((noteType) => (
          <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
      <SelectSection title={hasCustomNotes ? "Built-in Note Types" : undefined}>
        {persistedNoteTypes(builtinTypes).map((noteType) => (
          <SelectItem key={noteType.uuid}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
    </SafeSelect>
  );
};
