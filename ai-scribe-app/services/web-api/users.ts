import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";

const submitFeedback =
  (getAccessToken: () => WebApiToken) =>
  (
    submitted: Date,
    details: string,
    cancellation?: AbortSignal,
  ): Promise<void> =>
    httpAction<void>("POST", "api/users/current/submit-feedback", {
      data: {
        submitted: submitted.toISOString(),
        details: details,
      },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const routes = {
  submitFeedback,
} satisfies ApiRouterDefinition;
