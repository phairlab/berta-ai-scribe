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
    context?: string,
    label?: string,
    cancellation?: AbortSignal,
  ): Promise<Encounter> => {
    const formData = new FormData();

    formData.append("audio", audio);

    if (context) {
      formData.append("context", context);
    }

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

export const appendAudio =
  (getAccessToken: () => WebApiToken) =>
  (id: string, audio: File, cancellation?: AbortSignal): Promise<Encounter> => {
    const formData = new FormData();

    formData.append("audio", audio);

    return httpAction<Encounter>(
      "PATCH",
      `api/encounters/${id}/append-recording`,
      {
        data: formData,
        accessToken: getAccessToken(),
        signal: cancellation,
        retries: [500, 1000, 2000],
      },
    );
  };

export const update =
  (getAccessToken: () => WebApiToken) =>
  (
    id: string,
    changes: { label?: string; transcript?: string; context?: string },
    cancellation?: AbortSignal,
  ): Promise<Encounter> =>
    httpAction<Encounter>("PATCH", `api/encounters/${id}`, {
      data: changes,
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const deleteAndPurge =
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

export const setNoteFlag =
  (getAccessToken: () => WebApiToken) =>
  (
    encounterId: string,
    noteId: string,
    isFlagged: boolean,
    comments: string | null,
    cancellation?: AbortSignal,
  ): Promise<void> =>
    httpAction<void>(
      "PATCH",
      `api/encounters/${encounterId}/draft-notes/${noteId}/set-flag`,
      {
        data: { isFlagged, comments },
        accessToken: getAccessToken(),
        signal: cancellation,
      },
    );

export const routes = {
  getAll,
  create,
  appendAudio,
  update,
  deleteAndPurge,
  createDraftNote,
  discardDraftNote,
  setNoteFlag,
} satisfies ApiRouterDefinition;
