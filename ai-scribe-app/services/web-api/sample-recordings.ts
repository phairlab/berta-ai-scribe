import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { downloadFile, httpAction } from "./base-queries";
import { SampleRecording, TextResponse } from "./types";

const getAll =
  (getAccessToken: () => WebApiToken) =>
  (cancellation?: AbortSignal): Promise<SampleRecording[]> =>
    httpAction<SampleRecording[]>("GET", "api/sample-recordings", {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

const download =
  (getAccessToken: () => WebApiToken) =>
  (filename: string, cancellation?: AbortSignal): Promise<File> =>
    downloadFile(
      `/api/sample-recordings/${filename}/download`,
      filename,
      getAccessToken(),
      cancellation,
    );

const getTranscript =
  (getAccessToken: () => WebApiToken) =>
  (filename: string, cancellation?: AbortSignal): Promise<TextResponse> =>
    httpAction<TextResponse>(
      "GET",
      `api/sample-recordings/${filename}/transcript`,
      {
        accessToken: getAccessToken(),
        signal: cancellation,
      },
    );

export const routes = {
  getAll,
  download,
  getTranscript,
} satisfies ApiRouterDefinition;
