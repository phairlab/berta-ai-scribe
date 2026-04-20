import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";
import { ExternalChangeUpdate } from "./types";

const checkExternalChanges =
  (getAccessToken: () => WebApiToken) =>
  (
    cutoff: Date,
    cancellation?: AbortSignal,
  ): Promise<ExternalChangeUpdate | null> =>
    httpAction<ExternalChangeUpdate | null>(
      "GET",
      "api/monitoring/check-external-changes",
      {
        query: { cutoff: new Date(cutoff).toISOString() },
        accessToken: getAccessToken(),
        signal: cancellation,
      },
    );

export const routes = {
  checkDataChanges: checkExternalChanges,
} satisfies ApiRouterDefinition;
