import { use } from "react";

import { ApplicationStateContext } from "@/services/application-state/application-state-context";
import { useWebApi } from "@/services/web-api/use-web-api";

export function useSampleRecordings() {
  const applicationState = use(ApplicationStateContext);
  const webApi = useWebApi();

  const sampleRecordings = applicationState.sampleRecordings;

  const download = (filename: string) =>
    webApi.sampleRecordings.download(filename);

  return {
    isReady: sampleRecordings.status === "Ready",
    list: sampleRecordings.list,
    download,
  } as const;
}
