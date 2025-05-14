"use client";

import { ReactNode, useEffect } from "react";
import { useAtomValue } from "jotai";

import { authenticationStateAtom } from "@/services/identity";

import { ActiveEncounterProvider } from "./active-encounter-context";
import { EncountersProvider } from "./encounters-context";
import { ExternalStateMonitor } from "./external-state-monitor";
import { NoteTypesProvider } from "./note-types-context";
import { SampleRecordingsProvider } from "./sample-recordings-context";
import { ScribeStateProvider } from "./scribe-context";
import { UserInfoProvider } from "./user-info-context";

type ProviderProps = { children: ReactNode };

export const AppContextProviders = ({ children }: ProviderProps) => {
  const authenticationState = useAtomValue(authenticationStateAtom);
  
  useEffect(() => {
    console.log("Authentication state changed:", authenticationState);
  }, [authenticationState]);

  const Providers = [
    UserInfoProvider,
    SampleRecordingsProvider,
    NoteTypesProvider,
    EncountersProvider,
    ActiveEncounterProvider,
    ScribeStateProvider,
    ExternalStateMonitor,
  ];

  return Providers.toReversed().reduce(
    (acc, Provider) => <Provider>{acc}</Provider>,
    <>{children}</>,
  );
};
