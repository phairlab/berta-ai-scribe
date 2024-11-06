"use client";

import { ReactNode, useEffect, useState } from "react";

import { Encounter, NoteType, SampleRecording } from "@/core/types";
import { useSession } from "@/services/session-management/use-session";
import { useWebApi } from "@/services/web-api/use-web-api";
import * as convert from "@/utility/converters";
import { alphabetically, byDate } from "@/utility/sorters";

import {
  ApplicationStateContext,
  InitializationState,
} from "./application-state-context";
import { EncounterLoadState, useEncounterState } from "./encounter-state";
import { useNoteTypeState } from "./note-type-state";
import { useSampleRecordingState } from "./sample-recording-state";

type ApplicationStateProviderProps = {
  children: ReactNode;
};

export const ApplicationStateProvider = ({
  children,
}: ApplicationStateProviderProps) => {
  const webApi = useWebApi();
  const session = useSession();

  // Reactive state slices with default values.
  const [sampleRecordings, setSampleRecordings] = useState<SampleRecording[]>(
    [],
  );
  const [sampleRecordingStatus, setSampleRecordingStatus] =
    useState<InitializationState>("Uninitialized");
  const sampleRecordingState = useSampleRecordingState(
    sampleRecordingStatus,
    sampleRecordings,
  );

  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
  const [defaultNoteType, setDefaultNoteType] = useState<NoteType | null>(null);
  const [noteTypeStatus, setNoteTypeStatus] =
    useState<InitializationState>("Uninitialized");
  const noteTypeState = useNoteTypeState(
    noteTypeStatus,
    noteTypes,
    defaultNoteType,
    setNoteTypes,
    setDefaultNoteType,
  );

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [encounterLoadState, setEncounterLoadState] =
    useState<EncounterLoadState>("All Fetched");
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(
    null,
  );
  const [encounterStatus, setEncounterStatus] =
    useState<InitializationState>("Uninitialized");
  const encounterState = useEncounterState(
    encounterStatus,
    encounters,
    encounterLoadState,
    activeEncounter,
    setEncounters,
    setEncounterLoadState,
    setActiveEncounter,
  );

  // On successful authentication, prefetch data.
  useEffect(() => {
    if (session.state === "Authenticated") {
      prefetch();
    }
  }, [session]);

  /** Performs pre-fetching of application data. */
  async function prefetch() {
    // Prefetch sample recordings.
    setSampleRecordingStatus("Loading");
    webApi.sampleRecordings
      .getAll()
      .then((records) => {
        const sampleRecordings: SampleRecording[] = records
          .sort(alphabetically((x) => x.filename))
          .map((record) => ({
            id: record.filename,
            filename: record.filename,
            transcript: record.transcript,
          }));

        setSampleRecordings(sampleRecordings);
        setSampleRecordingStatus("Ready");
      })
      .catch(() => {
        setSampleRecordingStatus("Failed");
      });

    // Note Types
    setNoteTypeStatus("Loading");
    webApi.noteDefinitions
      .getAll()
      .then((records) => {
        const noteTypes: NoteType[] = records
          .sort(alphabetically((x) => x.title))
          .map((record) => convert.fromWebApiNoteType(record));

        setNoteTypes(noteTypes);

        // Derive current user's default note type.
        if (noteTypes.length > 0) {
          const userDefaultUuid =
            session.state === "Authenticated"
              ? session.details.defaultNoteType
              : undefined;

          const userDefault = noteTypes.find((d) => d.id === userDefaultUuid);
          const builtinDefault = noteTypes.find((d) => d.isSystemDefault);
          const fallbackDefault = noteTypes[0];

          setDefaultNoteType(userDefault ?? builtinDefault ?? fallbackDefault);
        }

        setNoteTypeStatus("Ready");
      })
      .catch(() => {
        setNoteTypeStatus("Failed");
      });

    setEncounterStatus("Loading");
    setEncounterLoadState("Fetching More");
    webApi.encounters
      .getAll()
      .then((page) => {
        const encounters: Encounter[] = page.data
          .sort(byDate((x) => x.created, "Descending"))
          .map((record) => convert.fromWebApiEncounter(record));

        setEncounters(encounters);
        setEncounterLoadState(
          page.isLastPage ? "All Fetched" : "Partially Fetched",
        );
        setEncounterStatus("Ready");
      })
      .catch(() => {
        setEncounterStatus("Failed");
      });
  }

  return (
    <ApplicationStateContext.Provider
      value={{
        sampleRecordings: sampleRecordingState,
        noteTypes: noteTypeState,
        encounters: encounterState,
      }}
    >
      {children}
    </ApplicationStateContext.Provider>
  );
};
