import { useState } from "react";

import { TextResponse } from "@/models";
import { ApplicationError, UnexpectedError } from "@/utility/errors";
import { downloadFile, webApiAction } from "@/utility/web-api";

import { useAbortSignal } from "./use-abort-signal";
import { useAccessToken } from "./use-access-token";

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
  const accessToken = useAccessToken();
  const { signal, abortController } = useAbortSignal();
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribe = async (audio: string | File) => {
    if (isTranscribing) {
      abortController.abort();
    }

    onTranscribing?.();
    setIsTranscribing(true);

    let file: File;
    const abortSignal = signal.current;

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

      const response = await webApiAction<TextResponse>(
        "POST",
        "/api/tasks/transcribe-audio",
        {
          data: formData,
          accessToken: accessToken,
          abortSignal: abortSignal,
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
    abortController.abort();
    setIsTranscribing(false);
  };

  return { transcribe, abort, isTranscribing } as const;
}
