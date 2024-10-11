import { use, useEffect, useState } from "react";

import { WebApiToken } from "@/services/web-api/authentication";

import { SessionContext } from "./session-context";

export function useAccessToken() {
  const session = use(SessionContext);
  const [accessToken, setAccessToken] = useState<WebApiToken>();

  useEffect(() => {
    if (session.state === "Authenticated") {
      setAccessToken(session.accessToken);
    } else if (session.state === "Failed") {
      setAccessToken(undefined);
    }
  }, [session]);

  return accessToken;
}
