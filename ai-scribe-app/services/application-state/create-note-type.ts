import shortUUID from "short-uuid";

import { IncompleteNoteType } from "@/core/types";

export function createNoteType(): IncompleteNoteType {
  const noteType: IncompleteNoteType = {
    id: shortUUID.generate(),
    modified: new Date().toISOString(),
    isBuiltin: false,
    isSystemDefault: false,
    outputType: "Markdown",
    isNew: true,
    isSaving: false,
  } satisfies IncompleteNoteType;

  return noteType;
}
