import { use } from "react";

import { ApplicationStateContext } from "@/services/application-state/application-state-context";

export function useDefaultNoteType() {
  const applicationState = use(ApplicationStateContext);

  return applicationState.defaultNoteType;
}
