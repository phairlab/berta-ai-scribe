import { WebApiToken } from "./authentication";
import * as encounters from "./encounters";
import * as noteDefinitions from "./note-definitions";
import * as sampleRecordings from "./sample-recordings";
import * as tasks from "./tasks";

export type ApiRouterDefinition = {
  [action: string]: (
    getAccessToken: () => WebApiToken,
  ) => (...args: any[]) => Promise<any>;
};

export type WebApiDefinition = {
  [router: string]: ApiRouterDefinition;
};

type Args<T> = T extends (
  getAccessToken: () => WebApiToken,
) => (...args: infer P) => Promise<any>
  ? P
  : never;

type Response<T> = T extends (
  getAccessToken: () => WebApiToken,
) => (...args: any[]) => Promise<infer R>
  ? R
  : never;

export type ApiRouter<Definition extends ApiRouterDefinition> = {
  [K in keyof Definition]: (
    ...args: Args<Definition[K]>
  ) => Promise<Response<Definition[K]>>;
};

export type WebApi<Definition extends WebApiDefinition> = {
  [K in keyof Definition]: ApiRouter<Definition[K]>;
};

function buildApiRouter<Definition extends ApiRouterDefinition>(
  definition: Definition,
  getAccessToken: () => WebApiToken,
): ApiRouter<typeof definition> {
  const routes: ApiRouter<typeof definition> = Object.entries(
    definition,
  ).reduce((router: any, [actionName, actionDefinition]) => {
    // Inject the access token.
    router[actionName] = actionDefinition(getAccessToken);

    return router;
  }, {});

  return routes;
}

export function buildApi<Definition extends WebApiDefinition>(
  definition: Definition,
  getAccessToken: () => WebApiToken,
): WebApi<typeof definition> {
  const webApi: WebApi<typeof definition> = Object.entries(definition).reduce(
    (api: any, [routerName, routerDefinition]) => {
      // Inject the router.
      api[routerName] = buildApiRouter(
        routerDefinition,
        getAccessToken,
      ) as ApiRouter<typeof routerDefinition>;

      return api;
    },
    {},
  );

  return webApi;
}

export const WebApiDefinition = {
  tasks: tasks.routes,
  sampleRecordings: sampleRecordings.routes,
  noteDefinitions: noteDefinitions.routes,
  encounters: encounters.routes,
} satisfies WebApiDefinition;
