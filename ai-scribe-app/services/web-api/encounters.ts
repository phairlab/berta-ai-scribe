import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";
import { Page, Encounter, NoteOutputType } from "./types";

export const getAll =
  (getAccessToken: () => WebApiToken) =>
  (
    earlierThan: Date | null = null,
    cancellation?: AbortSignal,
  ): Promise<Page<Encounter>> =>
    httpAction<Page<Encounter>>("GET", "api/encounters", {
      accessToken: getAccessToken(),
      query: {
        earlierThan: earlierThan
          ? new Date(earlierThan).toISOString()
          : undefined,
      },
      signal: cancellation,
    });

export const create =
  (getAccessToken: () => WebApiToken) =>
  (
    audio: File,
    label?: string,
    cancellation?: AbortSignal,
  ): Promise<Encounter> => {
    const formData = new FormData();

    formData.append("audio", audio);

    if (label) {
      formData.append("label", label);
    }

    return httpAction<Encounter>("POST", "api/encounters", {
      data: formData,
      accessToken: getAccessToken(),
      signal: cancellation,
      retries: [500, 1000, 2000],
    });
  };

export const update =
  (getAccessToken: () => WebApiToken) =>
  (
    id: string,
    changes: { label?: string; transcript?: string },
    cancellation?: AbortSignal,
  ): Promise<Encounter> =>
    httpAction<Encounter>("PATCH", `api/encounters/${id}`, {
      data: changes,
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const purgeData =
  (getAccessToken: () => WebApiToken) =>
  (id: string, cancellation?: AbortSignal): Promise<void> =>
    httpAction<void>("DELETE", `api/encounters/${id}`, {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const createDraftNote =
  (getAccessToken: () => WebApiToken) =>
  (
    encounterId: string,
    noteDefinitionId: string,
    noteId: string,
    title: string,
    content: string,
    outputType: NoteOutputType,
    cancellation?: AbortSignal,
  ): Promise<Encounter> =>
    httpAction<Encounter>("POST", `api/encounters/${encounterId}/draft-notes`, {
      data: {
        noteDefinitionId: noteDefinitionId,
        noteId: noteId,
        title: title,
        content: content,
        outputType: outputType,
      },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const discardDraftNote =
  (getAccessToken: () => WebApiToken) =>
  (
    encounterId: string,
    noteId: string,
    cancellation?: AbortSignal,
  ): Promise<void> =>
    httpAction<void>(
      "DELETE",
      `api/encounters/${encounterId}/draft-notes/${noteId}`,
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
  createDraftNote,
  discardDraftNote,
} satisfies ApiRouterDefinition;
