import { SampleRecording } from "@/core/types";

import { InitializationState } from "./application-state-context";

export type SampleRecordingState = {
  status: "Uninitialized" | "Loading" | "Ready" | "Failed";
  list: SampleRecording[];
};

export function useSampleRecordingState(
  status: InitializationState,
  sampleRecordings: SampleRecording[],
) {
  return {
    status: status,
    list: sampleRecordings,
  } satisfies SampleRecordingState;
}
