import { useAtomValue } from "jotai";

import { webApiTokenAtom } from "@/services/identity";

import { buildApi, WebApiDefinition } from "./api-definition";

export function useWebApi() {
  const token = useAtomValue(webApiTokenAtom);
  const webApi = buildApi(WebApiDefinition, () => token ?? '');

  return webApi;
}
