import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SampleRecording } from "@/core/types";
import { useSession } from "@/services/session-management/use-session";
import { useWebApi } from "@/services/web-api/use-web-api";
import { convertWebApiRecord } from "@/utility/conversion";
import { InvalidOperationError } from "@/utility/errors";
import { alphabetically } from "@/utility/sorting";

type InitState = "Initializing" | "Ready" | "Failed";

type ContextValue = {
  sampleRecordings: [
    SampleRecording[],
    Dispatch<SetStateAction<SampleRecording[]>>,
  ];
  initState: [InitState, Dispatch<SetStateAction<InitState>>];
};

type ProviderProps = { children: ReactNode };

const SampleRecordingsContext = createContext<ContextValue | undefined>(
  undefined,
);

function SampleRecordingsProvider({ children }: ProviderProps) {
  const webApi = useWebApi();
  const session = useSession();

  const [sampleRecordings, setSampleRecordings] = useState<SampleRecording[]>(
    [],
  );
  const [initState, setInitState] = useState<InitState>("Initializing");

  const value: ContextValue = useMemo(
    () => ({
      sampleRecordings: [sampleRecordings, setSampleRecordings],
      initState: [initState, setInitState],
    }),
    [sampleRecordings],
  );

  async function prefetch(abortSignal: AbortSignal) {
    const records = await webApi.sampleRecordings.getAll(abortSignal);
    const sampleRecordings = records
      .map((record) => convertWebApiRecord.toSampleRecording(record))
      .sort(alphabetically((s) => s.filename));

    setSampleRecordings(sampleRecordings);
  }

  useEffect(() => {
    if (session.state === "Authenticated") {
      const controller = new AbortController();

      setInitState("Initializing");
      prefetch(controller.signal)
        .then(() => setInitState("Ready"))
        .catch(() => setInitState("Failed"));

      return () => controller.abort();
    }

    return;
  }, [session]);

  return (
    <SampleRecordingsContext.Provider value={value}>
      {children}
    </SampleRecordingsContext.Provider>
  );
}

function useSampleRecordings() {
  const context = use(SampleRecordingsContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useSampleRecordings must be used within a SampleRecordingsProvider",
    );
  }

  const webApi = useWebApi();
  const [sampleRecordings] = context.sampleRecordings;
  const [initState] = context.initState;

  const download = (filename: string) =>
    webApi.sampleRecordings.download(filename);

  return {
    initState,
    list: sampleRecordings,
    download,
  };
}

export { SampleRecordingsProvider, useSampleRecordings };
