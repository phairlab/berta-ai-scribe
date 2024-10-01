"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";

import { NextUIProvider } from "@nextui-org/system";

import { ApplicationStateProvider } from "@/services/application-state/application-state-provider";
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
          <ApplicationStateProvider>{children}</ApplicationStateProvider>
        </AuthenticationProvider>
      </NextThemesProvider>
    </NextUIProvider>
  );
}
