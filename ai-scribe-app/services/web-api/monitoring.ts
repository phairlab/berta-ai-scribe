import { ApiRouterDefinition } from "./api-definition";
import { WebApiToken } from "./authentication";
import { httpAction } from "./base-queries";
import { DataChanges } from "./types";

const checkDataChanges =
  (getAccessToken: () => WebApiToken) =>
  (cutoff: Date, cancellation?: AbortSignal): Promise<DataChanges | null> =>
    httpAction<DataChanges | null>("GET", "api/monitoring/check-data-changes", {
      query: { cutoff: new Date(cutoff).toISOString() },
      accessToken: getAccessToken(),
      signal: cancellation,
    });

export const routes = {
  checkDataChanges,
} satisfies ApiRouterDefinition;
