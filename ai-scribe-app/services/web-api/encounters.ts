import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { downloadFile, httpAction } from "./base-queries";
import { DraftNote, Encounter } from "./types";

export const getAll =
  (getAccessToken: () => WebApiToken) =>
  (cancellation?: AbortSignal): Promise<Encounter[]> =>
    httpAction<Encounter[]>("GET", "api/encounters", {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const create =
  (getAccessToken: () => WebApiToken) =>
  (
    audio: File,
    createdAt: Date,
    title?: string,
    cancellation?: AbortSignal,
  ): Promise<Encounter> => {
    const formData = new FormData();

    formData.append("audio", audio);
    formData.append("createdAt", createdAt.toISOString());

    if (title) {
      formData.append("title", title);
    }

    return httpAction<Encounter>("POST", "/api/encounters", {
      data: formData,
      accessToken: getAccessToken(),
      signal: cancellation,
    });
  };

export const update =
  (getAccessToken: () => WebApiToken) =>
  (
    uuid: string,
    changes: { title?: string; transcript?: string },
    cancellation?: AbortSignal,
  ): Promise<Encounter> =>
    httpAction<Encounter>("PATCH", `api/encounters/${uuid}`, {
      data: changes,
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const purgeData =
  (getAccessToken: () => WebApiToken) =>
  (uuid: string, cancellation?: AbortSignal): Promise<void> =>
    httpAction<void>("DELETE", `api/encounters/${uuid}`, {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const downloadRecording =
  (getAccessToken: () => WebApiToken) =>
  (filename: string, cancellation?: AbortSignal): Promise<File> =>
    downloadFile(
      `/api/encounters/recording-files/${filename}`,
      filename,
      getAccessToken(),
      cancellation,
    );

export const createDraftNote =
  (getAccessToken: () => WebApiToken) =>
  (
    encounterUuid: string,
    noteDefinitionUuid: string,
    noteText: string,
    noteTag: string,
    cancellation?: AbortSignal,
  ): Promise<DraftNote> =>
    httpAction<DraftNote>(
      "POST",
      `api/encounters/${encounterUuid}/draft-notes`,
      {
        data: {
          noteDefinitionUuid: noteDefinitionUuid,
          noteText: noteText,
          noteTag: noteTag,
        },
        accessToken: getAccessToken(),
        signal: cancellation,
      },
    );

export const discardDraftNote =
  (getAccessToken: () => WebApiToken) =>
  (
    encounterUuid: string,
    tag: string,
    cancellation?: AbortSignal,
  ): Promise<void> =>
    httpAction<void>(
      "DELETE",
      `api/encounters/${encounterUuid}/draft-notes/${tag}`,
      {
        accessToken: getAccessToken(),
        signal: cancellation,
      },
    );

export const routes = {
  getAll,
  create,
  update,
  purgeData,
  downloadRecording,
  createDraftNote,
  discardDraftNote,
} satisfies ApiRouterDefinition;
