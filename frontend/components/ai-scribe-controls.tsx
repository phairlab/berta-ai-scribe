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

  return (
    <div className="flex flex-row items-center justify-center gap-4">
      <Select
        aria-label="Select a Note Type"
        className="flex-none w-40"
        defaultSelectedKeys={[summaryType]}
        placeholder="Make a Selection"
        selectionMode="single"
        size="md"
        onChange={(e) => setSummaryType(e.target.value)}
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
