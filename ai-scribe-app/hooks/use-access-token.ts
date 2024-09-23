import { useContext } from "react";

import { SessionContext } from "@/contexts/session-context";

export function useAccessToken() {
  const { accessToken } = useContext(SessionContext);

  return accessToken;
}
