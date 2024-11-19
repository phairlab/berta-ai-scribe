import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";
import { UserInfo } from "./types";

const getInfo =
  (getAccessToken: () => WebApiToken) =>
  (cancellation?: AbortSignal): Promise<UserInfo> =>
    httpAction<UserInfo>("GET", "api/user/info", {
      accessToken: getAccessToken(),
      signal: cancellation,
    });

const setDefaultNoteType =
  (getAccessToken: () => WebApiToken) =>
  (id: string, cancellation?: AbortSignal): Promise<void> =>
    httpAction<void>("PUT", "api/user/default-note-type", {
      data: id,
      accessToken: getAccessToken(),
      signal: cancellation,
    });

const submitFeedback =
  (getAccessToken: () => WebApiToken) =>
  (
    submitted: Date,
    details: string,
    cancellation?: AbortSignal,
  ): Promise<void> =>
    httpAction<void>("POST", "api/user/feedback", {
      data: {
        submitted: submitted.toISOString(),
        details: details,
      },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const routes = {
  getInfo,
  setDefaultNoteType,
  submitFeedback,
} satisfies ApiRouterDefinition;
