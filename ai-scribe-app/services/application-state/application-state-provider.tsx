"use client";

import { ReactNode, useEffect, useState } from "react";

import { useAccessToken } from "@/services/session-management/use-access-token";
import { useSession } from "@/services/session-management/use-session";
import { httpAction } from "@/services/web-api/base-queries";

import { Encounter } from "@/features/encounters/encounter";
import { NoteDefinition } from "@/features/note-types/note-definition";
import { SampleRecording } from "@/features/sample-recordings/sample-recording";

import {
  ApplicationState,
  ApplicationStateContext,
} from "./application-state-context";

type ApplicationStateProviderProps = {
  children: ReactNode;
};

export const ApplicationStateProvider = ({
  children,
}: ApplicationStateProviderProps) => {
  const { accessToken } = useAccessToken();
  const session = useSession();

  let isDisposed = false;

  function dispose() {
    isDisposed = true;
  }

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [noteTypes, setNoteTypes] = useState<NoteDefinition[]>([]);
  const [sampleRecordings, setSampleRecordings] = useState<SampleRecording[]>(
    [],
  );
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(
    null,
  );
  const [defaultNoteType, setDefaultNoteType] = useState<NoteDefinition | null>(
    null,
  );

  const [fetchStates, setFetchStates] = useState({
    encounters: false,
    noteTypes: false,
    sampleRecordings: false,
  });

  const state: ApplicationState = {
    encounters: {
      state: encounters,
      set: setEncounters,
      isFetched: fetchStates.encounters,
    },
    noteTypes: {
      state: noteTypes,
      set: setNoteTypes,
      isFetched: fetchStates.noteTypes,
    },
    sampleRecordings: {
      state: sampleRecordings,
      set: setSampleRecordings,
      isFetched: fetchStates.sampleRecordings,
    },
    activeEncounter: { state: activeEncounter, set: setActiveEncounter },
    defaultNoteType: { state: defaultNoteType, set: setDefaultNoteType },
  };

  async function prefetch() {
    httpAction<Encounter[]>("GET", "api/encounters", {
      accessToken: accessToken,
    }).then((data) => {
      if (!isDisposed) {
        setEncounters(data);
        setFetchStates((fs) => ({ ...fs, encounters: true }));
      }
    });

    httpAction<NoteDefinition[]>("GET", "api/note-definitions", {
      accessToken: accessToken,
    }).then((data) => {
      if (!isDisposed) {
        setNoteTypes(data);

        if (data.length > 0) {
          const userDefaultUuid =
            session.state === "Authenticated"
              ? session.data.defaultNoteType
              : undefined;

          const userDefault = data.find((d) => d.uuid === userDefaultUuid);
          const builtinDefault = data.find((d) => d.isDefault);
          const fallbackDefault = data[0];

          setDefaultNoteType(userDefault ?? builtinDefault ?? fallbackDefault);
        }

        setFetchStates((fs) => ({ ...fs, noteTypes: true }));
      }
    });

    httpAction<SampleRecording[]>("GET", "api/sample-recordings", {
      accessToken: accessToken,
    }).then((data) => {
      if (!isDisposed) {
        setSampleRecordings(data);
        setFetchStates((fs) => ({ ...fs, sampleRecordings: true }));
      }
    });
  }

  useEffect(() => {
    if (accessToken) {
      prefetch();
    }

    return dispose;
  }, [accessToken]);

  return (
    <ApplicationStateContext.Provider value={state}>
      {children}
    </ApplicationStateContext.Provider>
  );
};
