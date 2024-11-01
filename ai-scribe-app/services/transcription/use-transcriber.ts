import { useState } from "react";

import { Encounter } from "@/core/types";
import { useWebApi } from "@/services/web-api/use-web-api";
import { ApplicationError, UnexpectedError } from "@/utility/errors";
import { useAbortController } from "@/utility/use-abort-controller";

type TranscriberProps = {
  onTranscribing?: () => void;
  onTranscript: (transcript: string) => void;
  onError: (error: ApplicationError, retry: () => void) => void;
};

export function useTranscriber({
  onTranscribing,
  onTranscript,
  onError,
}: TranscriberProps) {
  const webApi = useWebApi();
  const controller = useAbortController();
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribe = async (encounter: Encounter) => {
    if (isTranscribing) {
      controller.abort();
    }

    if (!encounter.recording?.filename) {
      onError(UnexpectedError("Recording unavailable"), () =>
        transcribe(encounter),
      );
    } else {
      onTranscribing?.();
      setIsTranscribing(true);
      const abortSignal = controller.signal.current;

      try {
        const audio: File = await webApi.encounters.downloadRecording(
          encounter.recording.filename,
        );

        const response = await webApi.tasks.transcribeAudio(audio, abortSignal);

        onTranscript(response.text);
      } catch (e: unknown) {
        onError(e as ApplicationError, () => transcribe(encounter));
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const abort = () => {
    if (isTranscribing) {
      controller.abort();
      setIsTranscribing(false);
    }
  };

  return { transcribe, abort, isTranscribing } as const;
}
