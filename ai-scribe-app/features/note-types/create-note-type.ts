import shortUUID from "short-uuid";

import { EditedNoteType } from "@/core/types";
import { setTracking } from "@/utility/tracking";

export function createNoteType(): EditedNoteType {
  const noteType: EditedNoteType = setTracking(
    {
      id: shortUUID.generate(),
      modified: new Date(),
      isBuiltin: false,
      isSystemDefault: false,
      outputType: "Markdown",
    },
    "Not Persisted",
  );

  return noteType;
}
