import { useState } from "react";
import { Select, SelectItem } from "@nextui-org/select";
import { Button } from "@nextui-org/button";

const summaryTypes = [
  "Dx and DDx",
  "Feedback",
  "Full Visit",
  "Hallway Consult",
  "Handover Note",
  "Impression Note",
  "Medications",
  "Psych",
];

type AIScribeControlsProps = {
  canSubmit: boolean;
  onSubmit: (summaryType: string) => void;
};

export const AIScribeControls = (props: AIScribeControlsProps) => {
  const [summaryType, setSummaryType] = useState<string>("Full Visit");
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
        selectedKeys={[summaryType]}
        selectionMode="single"
        size="md"
        onChange={(e) => {
          setSummaryType(e.target.value);
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
        {summaryTypes.map((type) => (
          <SelectItem key={type}>{type}</SelectItem>
        ))}
      </Select>
      <Button
        className="flex-none"
        color="primary"
        isDisabled={!props.canSubmit}
        size="md"
        onClick={() => props.onSubmit(summaryType)}
      >
        Generate Note
      </Button>
    </div>
  );
};
