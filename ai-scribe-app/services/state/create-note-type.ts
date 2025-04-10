import shortUUID from "short-uuid";

import { IncompleteNoteType } from "@/core/types";

import { FALLBACK_RECOMMENDED_MODEL } from "./user-info-context";

export function createNoteType(model?: string): IncompleteNoteType {
  const noteType: IncompleteNoteType = {
    id: shortUUID.generate(),
    modified: new Date().toISOString(),
    category: "Custom",
    model: model ?? FALLBACK_RECOMMENDED_MODEL.name,
    isBuiltin: false,
    isSystemDefault: false,
    outputType: "Markdown",
    isNew: true,
    isSaving: false,
  } satisfies IncompleteNoteType;

  return noteType;
}
