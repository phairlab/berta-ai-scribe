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

  function recoverSession(): UserSession | null {
    const token = sessionStorage.getItem(sessionKeys.AccessToken);

    if (token) {
      const sessionData = jwtDecode<UserSessionData>(token);

      return {
        state: "Authenticated",
        accessToken: token,
        data: sessionData,
      };
    }

    return null;
  }

  const startSession = async () => {
    setSession({ state: "Authenticating" });

    try {
      const token = await authenticate();
      const sessionData = jwtDecode<UserSessionData>(token);

      // Cache the access token to session storage.
      sessionStorage.setItem(sessionKeys.AccessToken, token);

      setSession({
        state: "Authenticated",
        accessToken: token,
        data: sessionData,
      });
    } catch (e: unknown) {
      setSession({ state: "Failed" });

      throw Error((e as Error).message);
    }
  };

  // On load, initiate a session.
  useEffect(() => {
    if (session.state === "Unauthenticated") {
      const recoveredSession = recoverSession();

      if (recoveredSession) {
        setSession(recoveredSession);
      } else {
        startSession();
      }
    }
  }, []);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};
