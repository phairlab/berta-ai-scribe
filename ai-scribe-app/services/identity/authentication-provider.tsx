"use client";

import { ReactNode, useEffect } from "react";

import { useAtom } from "jotai";

import { authenticate } from "@/services/web-api/authentication";

import { authenticationAtom } from ".";

type AuthenticationProviderProps = {
  children: ReactNode;
};

export const AuthenticationProvider = ({
  children,
}: AuthenticationProviderProps) => {
  const [authentication, setAuthentication] = useAtom(authenticationAtom);

  const startSession = async (): Promise<void> => {
    setAuthentication({ state: "Authenticating" });

    try {
      const webApiToken = await authenticate();

      if (!webApiToken) {
        throw Error("An unexpected error occurred while connecting");
      }

      setAuthentication({ state: "Authenticated", token: webApiToken });
    } catch (ex: unknown) {
      setAuthentication({ state: "Failed" });
      throw ex;
    }
  };

  // On load, start a session.
  useEffect(() => {
    if (authentication.state === "Unauthenticated") {
      startSession();
    }
  }, [authentication.state]);

  return children;
};
