"use client";

import { ReactNode, useEffect, useState } from "react";

import { jwtDecode } from "jwt-decode";

import { sessionKeys } from "@/config/keys";
import { authenticate } from "@/services/web-api/authentication";

import {
  SessionContext,
  UserSessionData,
  UserSession,
} from "./session-context";

type AuthenticationProviderProps = {
  children: ReactNode;
};

export const AuthenticationProvider = ({
  children,
}: AuthenticationProviderProps) => {
  const [session, setSession] = useState<UserSession>({
    state: "Unauthenticated",
  });

  const startSession = async () => {
    setSession({ state: "Authenticating" });

    try {
      const token = await authenticate();

      if (!token) {
        throw Error("An error occurred while starting a session");
      }

      const sessionData = jwtDecode<UserSessionData>(token);

      // Cache the access token to session storage.
      sessionStorage.setItem(sessionKeys.AccessToken, token);

      setSession({
        state: "Authenticated",
        accessToken: token,
        details: sessionData,
      });
    } catch (e: unknown) {
      setSession({ state: "Failed" });

      throw Error((e as Error).message);
    }
  };

  // On load, initiate a session.
  useEffect(() => {
    if (session.state === "Unauthenticated") {
      startSession();
    }
  }, []);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};
