import { useState } from "react";

import { useAccessToken } from "@/services/session-management/use-access-token";
import { downloadFile, httpAction } from "@/services/web-api/base-queries";
import { ApplicationError, UnexpectedError } from "@/utility/errors";
import { useAbortController } from "@/utility/use-abort-controller";

export type TranscriberOutput = {
  text: string;
};

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
  const { accessToken } = useAccessToken();
  const controller = useAbortController();
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribe = async (audio: string | File) => {
    if (isTranscribing) {
      controller.abort();
    }

    onTranscribing?.();
    setIsTranscribing(true);

    let file: File;
    const abortSignal = controller.signal.current;

    if (typeof audio === "string") {
      try {
        file = await downloadFile(
          audio,
          audio.split("/").reverse()[0],
          accessToken,
          abortSignal,
        );
      } catch (e: unknown) {
        onError(UnexpectedError((e as Error).message), () => transcribe(audio));
        setIsTranscribing(false);

        return;
      }
    } else {
      file = audio;
    }

    try {
      const formData = new FormData();

      formData.append("audio", file);

      const response = await httpAction<TranscriberOutput>(
        "POST",
        "/api/tasks/transcribe-audio",
        {
          data: formData,
          accessToken: accessToken,
          signal: abortSignal,
        },
      );

      onTranscript(response.text);
    } catch (e: unknown) {
      onError(e as ApplicationError, () => transcribe(audio));
    } finally {
      setIsTranscribing(false);
    }
  };

  const abort = () => {
    controller.abort();
    setIsTranscribing(false);
  };

  return { transcribe, abort, isTranscribing } as const;
}
