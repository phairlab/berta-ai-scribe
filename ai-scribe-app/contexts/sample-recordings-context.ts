import { createContext } from "react";

import { SampleRecording } from "@/models/sample-recording";

export const SampleRecordingsContext = createContext({
  sampleRecordings: [] as SampleRecording[],
  setSampleRecordings: (() => {}) as (
    sampleRecordings: SampleRecording[],
  ) => void,
});
