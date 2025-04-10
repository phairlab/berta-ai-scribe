import clsx from "clsx";

import { SelectItem, SelectSection } from "@heroui/react";

import { useCurrentUser } from "@/services/state/user-info-context";
import { alphabetically } from "@/utility/sorting";

import { MobileCompatibleSelect } from "./mobile-compatible-select";

type LanguageModelSelectorProps = {
  isRequired: boolean;
  selected: string;
  onChange: (model: string) => void;
};

export const LanguageModelSelector = ({
  selected,
  onChange,
  isRequired = false,
}: LanguageModelSelectorProps) => {
  const userInfo = useCurrentUser();
  const modelGroups = [
    {
      name: "Large Models",
      models: userInfo.settings.availableLlms.models
        .filter((llm) => llm.size === "Large")
        .sort(alphabetically((llm) => llm.name)),
    },
    {
      name: "Medium Models",
      models: userInfo.settings.availableLlms.models
        .filter((llm) => llm.size === "Medium")
        .sort(alphabetically((llm) => llm.name)),
    },
    {
      name: "Small Models",
      models: userInfo.settings.availableLlms.models
        .filter((llm) => llm.size === "Small")
        .sort(alphabetically((llm) => llm.name)),
    },
  ];

  return (
    <MobileCompatibleSelect
      aria-label="Select a Model"
      disallowEmptySelection={true}
      isDisabled={userInfo.initState !== "Ready"}
      isLoading={userInfo.initState === "Initializing"}
      isRequired={isRequired}
      label="Model"
      labelPlacement="outside"
      selectedKeys={[selected]}
      selectionMode="single"
      size="md"
      onSelectionChange={(keys) => onChange(keys.currentKey ?? "")}
    >
      {modelGroups.map((group) => (
        <SelectSection
          key={group.name}
          className={clsx({ hidden: group.models.length === 0 })}
          title={group.name}
        >
          {group.models.map((model) => (
            <SelectItem key={model.name} textValue={model.name}>
              {model.name}
              {model.name == userInfo.settings.availableLlms.recommended && (
                <span className="text-zinc-500"> (recommended)</span>
              )}
            </SelectItem>
          ))}
        </SelectSection>
      ))}
    </MobileCompatibleSelect>
  );
};
