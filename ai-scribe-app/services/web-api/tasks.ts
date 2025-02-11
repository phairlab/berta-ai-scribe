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
    context?: string,
    model?: string,
    cancellation?: AbortSignal,
  ): Promise<NoteGeneratorOutput> =>
    httpAction<NoteGeneratorOutput>("POST", "/api/tasks/generate-draft-note", {
      data: { instructions, transcript, outputType, context, model },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const routes = {
  transcribeAudio,
  generateDraftNote,
} satisfies ApiRouterDefinition;
