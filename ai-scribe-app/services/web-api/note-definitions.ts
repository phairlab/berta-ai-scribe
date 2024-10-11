import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";
import { NoteDefinition } from "./types";

export const getAll =
  (getAccessToken: () => WebApiToken) =>
  (cancellation?: AbortSignal): Promise<NoteDefinition[]> =>
    httpAction<NoteDefinition[]>("GET", "api/note-definitions", {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const create =
  (getAccessToken: () => WebApiToken) =>
  (
    title: string,
    instructions: string,
    cancellation?: AbortSignal,
  ): Promise<NoteDefinition> =>
    httpAction<NoteDefinition>("POST", "api/note-definitions", {
      data: {
        title: title,
        instructions: instructions,
      },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const update =
  (getAccessToken: () => WebApiToken) =>
  (
    uuid: string,
    changes: { title?: string; instructions?: string },
    cancellation?: AbortSignal,
  ): Promise<NoteDefinition> =>
    httpAction<NoteDefinition>("PATCH", `api/note-definitions/${uuid}`, {
      data: changes,
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const discard =
  (getAccessToken: () => WebApiToken) =>
  (uuid: string, cancellation?: AbortSignal): Promise<void> =>
    httpAction<void>("DELETE", `api/note-definitions/${uuid}`, {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const setDefault =
  (getAccessToken: () => WebApiToken) =>
  (uuid: string, cancellation?: AbortSignal): Promise<void> =>
    httpAction<void>("PATCH", `api/note-definitions/${uuid}/set-default`, {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const routes = {
  getAll,
  create,
  update,
  discard,
  setDefault,
} satisfies ApiRouterDefinition;
