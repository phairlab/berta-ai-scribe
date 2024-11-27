import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";
import {
  NoteGeneratorOutput,
  NoteOutputType,
  TranscriberOutput,
} from "./types";

const transcribeAudio =
  (getAccessToken: () => WebApiToken) =>
  (
    recordingId: string,
    cancellation?: AbortSignal,
  ): Promise<TranscriberOutput> => {
    return httpAction<TranscriberOutput>(
      "POST",
      "/api/tasks/transcribe-audio",
      {
        data: recordingId,
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
    outputType: NoteOutputType,
    cancellation?: AbortSignal,
  ): Promise<NoteGeneratorOutput> =>
    httpAction<NoteGeneratorOutput>("POST", "/api/tasks/generate-draft-note", {
      data: {
        instructions: instructions,
        transcript: transcript,
        outputType: outputType,
      },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const routes = {
  transcribeAudio,
  generateDraftNote,
} satisfies ApiRouterDefinition;
