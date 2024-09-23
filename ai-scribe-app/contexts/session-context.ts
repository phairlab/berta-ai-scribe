import { createContext } from "react";

import { UserSession } from "@/models";

export type SessionData = {
  accessToken: string;
  session: UserSession;
};

export const SessionContext = createContext<SessionData>({
  accessToken: "",
  session: {
    username: "Anonymous",
    sessionId: "",
    rights: [],
  },
});
