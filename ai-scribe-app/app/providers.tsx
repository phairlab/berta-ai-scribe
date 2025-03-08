"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
} from "next-themes";

import { HeroUIProvider } from "@heroui/system";

import { AuthenticationProvider } from "@/services/identity/authentication-provider";
import { AppContextProviders } from "@/services/state/app-context-providers";
import { JotaiProvider } from "@/services/state/jotai-provider";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <JotaiProvider>
          <AuthenticationProvider>
            <AppContextProviders>{children}</AppContextProviders>
          </AuthenticationProvider>
        </JotaiProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
