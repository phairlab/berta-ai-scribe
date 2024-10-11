import { useAccessToken } from "@/services/session-management/use-access-token";

import { buildApi, WebApiDefinition } from "./api-definition";

export function useWebApi() {
  const accessToken = useAccessToken();
  const webApi = buildApi(WebApiDefinition, () => accessToken);

  return webApi;
}
