import { use, useEffect, useState } from "react";

import {
  AuthenticationState,
  SessionContext,
  UserSession,
  UserSessionData,
} from "./session-context";

type SessionData =
  | {
      state: "Authenticated";
      data: UserSessionData;
    }
  | {
      state: Exclude<AuthenticationState, "Authenticated">;
    };

export function useSession() {
  const session = use(SessionContext);
  const [sessionData, setSessionData] = useState<SessionData>(map(session));

  function map(session: UserSession): SessionData {
    return session.state === "Authenticated"
      ? { state: session.state, data: session.data }
      : { state: session.state };
  }

  useEffect(() => {
    setSessionData(map(session));
  }, [session]);

  return sessionData;
}
