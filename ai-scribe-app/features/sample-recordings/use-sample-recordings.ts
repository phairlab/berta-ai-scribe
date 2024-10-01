import { use } from "react";

import { ApplicationStateContext } from "@/services/application-state/application-state-context";

export function useSampleRecordings() {
  const applicationState = use(ApplicationStateContext);

  return applicationState.sampleRecordings;
}
