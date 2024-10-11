import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";
import { NoteGeneratorOutput, TranscriberOutput } from "./types";

const transcribeAudio =
  (getAccessToken: () => WebApiToken) =>
  (audio: File, cancellation?: AbortSignal): Promise<TranscriberOutput> => {
    const formData = new FormData();

    formData.append("audio", audio);

    return httpAction<TranscriberOutput>(
      "POST",
      "/api/tasks/transcribe-audio",
      {
        data: formData,
        accessToken: getAccessToken(),
        signal: cancellation,
      },
    );
  };

const generateDraftNote =
  (getAccessToken: () => WebApiToken) =>
  (
    instructions: string,
    transcript: string,
    cancellation?: AbortSignal,
  ): Promise<NoteGeneratorOutput> =>
    httpAction<NoteGeneratorOutput>("POST", "/api/tasks/generate-draft-note", {
      data: { instructions: instructions, transcript: transcript },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const routes = {
  transcribeAudio,
  generateDraftNote,
} satisfies ApiRouterDefinition;
