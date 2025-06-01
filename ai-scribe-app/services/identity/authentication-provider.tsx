"use client";

import { ReactNode, useEffect } from "react";
import { useAtom } from "jotai";
import { useRuntimeConfig } from "@/services/state/runtime-config-context";

import { authenticationAtom } from ".";

type AuthenticationProviderProps = {
  children: ReactNode;
};

export const AuthenticationProvider = ({
  children,
}: AuthenticationProviderProps) => {
  const [authentication, setAuthentication] = useAtom(authenticationAtom);
  const runtimeConfig = useRuntimeConfig();
  
  // Check if auth is enabled via runtime config
  const isCognitoEnabled = runtimeConfig.NEXT_PUBLIC_USE_COGNITO === 'true';
  const isGoogleAuthEnabled = process.env.NEXT_PUBLIC_USE_GOOGLE_AUTH === 'true';

  const startSession = async (): Promise<void> => {
    try {
      console.log("[AuthProvider] Starting authentication session...");
      setAuthentication({ state: "Authenticating" });


      console.log("[AuthProvider] Checking session with backend");
      const response = await fetch(`/api/auth/check-session`, {
        method: 'POST', 
        credentials: 'include',
      });

      console.log("[AuthProvider] Session check response status:", response.status);
      
      if (!response.ok) {
        console.log("[AuthProvider] Session check failed with status:", response.status);
        throw new Error(`Session check failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("[AuthProvider] Session check response data:", data);
      
      if (!data.accessToken) {
        console.log("[AuthProvider] No access token in response");
        throw new Error("No token received from session check");
      }

      console.log("[AuthProvider] Setting authentication state to Authenticated");
      setAuthentication({ state: "Authenticated", token: data.accessToken });
    } catch (ex: unknown) {
      console.error("[AuthProvider] Authentication failed:", ex);
      
      if (process.env.NODE_ENV === "development" && !isCognitoEnabled && !isGoogleAuthEnabled) {
        console.log("[AuthProvider] Auto-authenticating in development mode...");
        setAuthentication({ 
          state: "Authenticated", 
          token: "development_token" 
        });
      } else {
        setAuthentication({ state: "Failed" });
      }
    }
  };

  useEffect(() => {
    if (authentication.state === "Unauthenticated" && !window.location.pathname.startsWith('/login')) {
      console.log("[AuthProvider] Current path:", window.location.pathname);
      
      if (isCognitoEnabled || isGoogleAuthEnabled) {
        const hasSessionCookie = document.cookie.includes('jenkins_session=');
        console.log("[AuthProvider] Session cookie present:", hasSessionCookie);
        
        if (!hasSessionCookie) {
          console.log("[AuthProvider] No session cookie found, redirecting to login...");
          window.location.href = '/login';
          return;
        }
        startSession();
      } else if (process.env.NODE_ENV === "development") {
        console.log("[AuthProvider] Auto-authenticating in development mode...");
        setAuthentication({ 
          state: "Authenticated", 
          token: "development_token" 
        });
      } else {
        startSession();
      }
    }
  }, [authentication.state]);

  return children;
};