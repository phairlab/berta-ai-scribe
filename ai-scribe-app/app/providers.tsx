"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
} from "next-themes";

import { NextUIProvider } from "@nextui-org/system";

import { AppContextProviders } from "@/services/application-state/app-context-providers";
import { AuthenticationProvider } from "@/services/session-management/authentication-provider";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <AuthenticationProvider>
          <AppContextProviders>{children}</AppContextProviders>
        </AuthenticationProvider>
      </NextThemesProvider>
    </NextUIProvider>
  );
}
