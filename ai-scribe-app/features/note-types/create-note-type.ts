import shortUUID from "short-uuid";

import { EditedNoteType } from "@/core/types";
import { setTracking } from "@/utility/tracking";

export function createNoteType(): EditedNoteType {
  const noteType: EditedNoteType = setTracking(
    {
      uuid: shortUUID.generate(),
      createdAt: new Date(),
      isBuiltin: false,
      isDefault: false,
      isDiscarded: false,
    },
    "Not Persisted",
  );

  return noteType;
}
