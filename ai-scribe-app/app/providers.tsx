"use client";

import * as React from "react";
import { NextUIProvider } from "@nextui-org/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";

import { SessionContext, SessionData } from "@/contexts/session-context";
import { AppContextDataProvider } from "@/components/app-context-data-provider";
import { AppContextData } from "@/models";

export interface ProvidersProps {
  children: React.ReactNode;
  appContextData: AppContextData;
  sessionData: SessionData;
  themeProps?: ThemeProviderProps;
}

export function Providers({
  children,
  appContextData,
  sessionData,
  themeProps,
}: ProvidersProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <SessionContext.Provider value={sessionData}>
          <AppContextDataProvider data={appContextData}>
            {children}
          </AppContextDataProvider>
        </SessionContext.Provider>
      </NextThemesProvider>
    </NextUIProvider>
  );
}
