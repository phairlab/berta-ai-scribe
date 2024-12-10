import shortUUID from "short-uuid";

import { IncompleteNoteType } from "@/core/types";
import { setTracking } from "@/utility/tracking";

export function createNoteType(): IncompleteNoteType {
  const noteType: IncompleteNoteType = setTracking(
    {
      id: shortUUID.generate(),
      modified: new Date().toISOString(),
      isBuiltin: false,
      isSystemDefault: false,
      outputType: "Markdown",
    },
    "Not Persisted",
  );

  return noteType;
}
