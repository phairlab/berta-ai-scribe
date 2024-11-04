import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { downloadFile } from "./base-queries";

export const download =
  (getAccessToken: () => WebApiToken) =>
  (recordingId: string, cancellation?: AbortSignal): Promise<File> =>
    downloadFile(
      `/api/recordings/${recordingId}/download`,
      `${recordingId}.mp3`,
      getAccessToken(),
      cancellation,
    );

export const routes = {
  download,
} satisfies ApiRouterDefinition;
