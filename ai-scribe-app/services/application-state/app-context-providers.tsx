"use client";

import { ReactNode } from "react";

import { ActiveEncounterProvider } from "./active-encounter-context";
import { EncountersProvider } from "./encounters-context";
import { ExternalStateMonitor } from "./external-state-monitor";
import { NoteTypesProvider } from "./note-types-context";
import { SampleRecordingsProvider } from "./sample-recordings-context";
import { ScribeStateProvider } from "./scribe-context";
import { UserInfoProvider } from "./user-info-context";

type ProviderProps = { children: ReactNode };

export const AppContextProviders = ({ children }: ProviderProps) => {
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
