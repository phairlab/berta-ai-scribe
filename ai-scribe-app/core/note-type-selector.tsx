import { ReactNode } from "react";

import clsx from "clsx";

import { SelectItem, SelectSection } from "@heroui/select";

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
  const commonTypes = builtinTypes.filter((nt) => nt.category === "Common");
  const otherTypes = builtinTypes.filter((nt) => nt.category === "Other");
  const sectionTypes = builtinTypes.filter(
    (nt) => nt.category === "Individual Sections",
  );

  const isMultiSection =
    customTypes.length > 0 || otherTypes.length > 0 || sectionTypes.length > 0;

  const noteTypesByCategory = (category: string) =>
    builtinTypes.filter((nt) => nt.category === category);

  const onlySaved = (noteTypes: NoteType[]) =>
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
        className={clsx({ hidden: customTypes.length === 0 })}
        title="Custom Note Types"
      >
        {onlySaved(customTypes).map((noteType) => (
          <SelectItem key={noteType.id}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
      <SelectSection title={isMultiSection ? "Common Note Types" : undefined}>
        {onlySaved(commonTypes).map((noteType) => (
          <SelectItem key={noteType.id}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
      <SelectSection
        className={clsx({ hidden: otherTypes.length === 0 })}
        title="Other Note Types"
      >
        {onlySaved(noteTypesByCategory("Other")).map((noteType) => (
          <SelectItem key={noteType.id}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
      <SelectSection
        className={clsx({ hidden: sectionTypes.length === 0 })}
        title="Individual Sections"
      >
        {onlySaved(sectionTypes).map((noteType) => (
          <SelectItem key={noteType.id}>{noteType.title}</SelectItem>
        ))}
      </SelectSection>
    </MobileCompatibleSelect>
  );
};
