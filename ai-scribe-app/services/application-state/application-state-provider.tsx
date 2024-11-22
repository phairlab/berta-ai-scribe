"use client";

import { PropsWithChildren, useEffect, useState } from "react";

import { Encounter, NoteType, SampleRecording } from "@/core/types";
import { useSession } from "@/services/session-management/use-session";
import { useWebApi } from "@/services/web-api/use-web-api";
import * as convert from "@/utility/converters";
import { alphabetically, byDate } from "@/utility/sorters";
import { useAbortController } from "@/utility/use-abort-controller";

import {
  ApplicationStateContext,
  InitializationState,
} from "./application-state-context";
import { EncounterLoadState, useEncounterState } from "./encounter-state";
import { ExternalStateMonitor } from "./external-state-monitor";
import { useNoteTypeState } from "./note-type-state";
import { useSampleRecordingState } from "./sample-recording-state";

export const ApplicationStateProvider = ({ children }: PropsWithChildren) => {
  const webApi = useWebApi();
  const session = useSession();
  const abortController = useAbortController();

  // Configure state slices.
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

  // Build components into application state.
  const applicationState = {
    sampleRecordings: sampleRecordingState,
    noteTypes: noteTypeState,
    encounters: encounterState,
  };

  // On successful authentication, prefetch data.
  useEffect(() => {
    if (session.state === "Authenticated") {
      prefetch(abortController.signal.current);

      // Abort prefetch on unmount.
      return () => abortController.abort();
    }

    return;
  }, [session]);

  /** Performs pre-fetching of application data. */
  async function prefetch(abortSignal: AbortSignal) {
    const getUserInfo = webApi.user.getInfo(abortSignal);

    // Prefetch sample recordings.
    setSampleRecordingStatus("Loading");
    webApi.sampleRecordings
      .getAll(abortSignal)
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
    Promise.all([getUserInfo, webApi.noteDefinitions.getAll(abortSignal)])
      .then(([userInfo, records]) => {
        const noteTypes: NoteType[] = records
          .sort(alphabetically((x) => x.title))
          .map((record) => convert.fromWebApiNoteType(record));

        setNoteTypes(noteTypes);

        // Derive current user's default note type.
        if (noteTypes.length > 0) {
          const userDefault = noteTypes.find(
            (d) => d.id === userInfo.defaultNoteType,
          );
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
      .getAll(null, abortSignal)
      .then((page) => {
        const encounters: Encounter[] = page.data
          .sort(byDate((x) => new Date(x.created), "Descending"))
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
    <ApplicationStateContext.Provider value={applicationState}>
      <ExternalStateMonitor>{children}</ExternalStateMonitor>
    </ApplicationStateContext.Provider>
  );
};
