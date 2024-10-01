import { use } from "react";

import { ApplicationStateContext } from "@/services/application-state/application-state-context";

export function useActiveEncounter() {
  const applicationState = use(ApplicationStateContext);

  return applicationState.activeEncounter;
}
