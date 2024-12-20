import { Recording } from "@/services/web-api/types";
import { useWebApi } from "@/services/web-api/use-web-api";
import { asApplicationError } from "@/utility/errors";

export function useTranscriber() {
  const webApi = useWebApi();

  /** Transcribes a recording's audio file and returns the transcription text. */
  const transcribe = async (recording: Recording, abortSignal: AbortSignal) => {
    try {
      const response = await webApi.tasks.transcribeAudio(
        recording.id,
        abortSignal,
      );

      return response.text;
    } catch (ex: unknown) {
      throw asApplicationError(ex);
    }
  };

  return { transcribe };
}
