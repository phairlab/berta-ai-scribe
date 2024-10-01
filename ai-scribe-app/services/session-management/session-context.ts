import { createContext } from "react";

export type UserSessionData = {
  username: string;
  sessionId?: string;
  rights: string[];
  defaultNoteType?: string;
};

export type AuthenticationState =
  | "Unauthenticated"
  | "Authenticating"
  | "Authenticated"
  | "Failed";

export type UserSession =
  | {
      state: "Authenticated";
      accessToken: string;
      data: UserSessionData;
    }
  | {
      state: Exclude<AuthenticationState, "Authenticated">;
    };

export const SessionContext = createContext<UserSession>({
  state: "Unauthenticated",
});
