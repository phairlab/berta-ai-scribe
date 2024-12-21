import { Progress } from "@nextui-org/progress";

import {
  Encounter,
  ScribeAction,
  ScribeActionType,
  ScribeError,
} from "@/core/types";
import { useScribe } from "@/services/application-state/scribe-context";

const IMPORTANT_ACTION_TYPES: ScribeActionType[] = ["Saving", "Transcribing"];

type EncounterLabelProps = {
  encounter: Encounter;
};

export const EncounterLabel = ({ encounter }: EncounterLabelProps) => {
  const scribe = useScribe();
  const { action, error } = scribe.get(encounter.id);

  const label =
    encounter.label ?? encounter.autolabel ?? encounter.id.toUpperCase();

  function isImportant<T extends { type: ScribeActionType }>(
    entity: T | undefined,
  ): entity is T {
    return entity !== undefined && IMPORTANT_ACTION_TYPES.includes(entity.type);
  }

  function actionLabel(action: ScribeAction) {
    switch (action.type) {
      case "Generating Note":
        return "Generating";
      default:
        return action.type;
    }
  }

  function errorLabel(error: ScribeError) {
    switch (error.type) {
      case "Saving":
        return "Failed to Save";
      case "Transcribing":
        return "Transcription Failed";
      case "Generating Note":
        return "Failed to Generate Note";
      case "Regenerating Notes":
        return "Failed to Regenerate Notes";
    }
  }

  return isImportant(error) ? (
    <div className="ms-1 font-semibold text-red-500">
      {errorLabel(error).toUpperCase()}
    </div>
  ) : action ? (
    <div className="flex flex-row gap-2 items-center justify-start ms-1">
      <div className="text-xs line-clamp-1">{actionLabel(action)}</div>
      <Progress
        isIndeterminate
        aria-label="Saving"
        className="mt-1 w-10"
        color="default"
        size="sm"
      />
    </div>
  ) : (
    <div className="pe-2 line-clamp-2 text-ellipse">{label}</div>
  );
};
