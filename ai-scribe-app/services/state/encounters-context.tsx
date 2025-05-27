import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAtomValue } from "jotai";

import { DraftNote, Encounter } from "@/core/types";
import { authenticationStateAtom } from "@/services/identity";
import { useWebApi } from "@/services/web-api/use-web-api";
import { convertWebApiRecord } from "@/utility/conversion";
import { InvalidOperationError } from "@/utility/errors";
import { byDate } from "@/utility/sorting";
import { useRuntimeConfig } from "@/services/state/runtime-config-context";

import { createEncounter } from "./create-encounter";

type InitState = "Initializing" | "Ready" | "Failed";
type FetchState = "Fetching More" | "Partially Fetched" | "All Fetched";

type ContextValue = {
  encounters: [Encounter[], Dispatch<SetStateAction<Encounter[]>>];
  fetchState: [FetchState, Dispatch<SetStateAction<FetchState>>];
  initState: [InitState, Dispatch<SetStateAction<InitState>>];
};

type ProviderProps = { children: ReactNode };

const EncountersContext = createContext<ContextValue | undefined>(undefined);

function EncountersProvider({ children }: ProviderProps) {
  const webApi = useWebApi();
  const authenticationState = useAtomValue(authenticationStateAtom);
  const runtimeConfig = useRuntimeConfig();

  const [initState, setInitState] = useState<InitState>("Initializing");
  const [fetchState, setFetchState] = useState<FetchState>("Fetching More");
  const [encounters, setEncounters] = useState<Encounter[]>([]);

  const value: ContextValue = useMemo(
    () => ({
      encounters: [encounters, setEncounters],
      fetchState: [fetchState, setFetchState],
      initState: [initState, setInitState],
    }),
    [encounters, fetchState, initState],
  );

  async function prefetch(abortSignal: AbortSignal) {
    const page = await webApi.encounters.getAll(null, abortSignal);
    const encounters = page.data
      .map((record) => convertWebApiRecord.toEncounter(record))
      .sort(byDate((e) => new Date(e.created), "Descending"));

    setEncounters(encounters);
    setFetchState(page.isLastPage ? "All Fetched" : "Partially Fetched");
  }

  useEffect(() => {
    if (
      authenticationState === "Authenticated" &&
      runtimeConfig.NEXT_PUBLIC_BACKEND_URL
    ) {
      const controller = new AbortController();
      setInitState("Initializing");
      prefetch(controller.signal)
        .then(() => setInitState("Ready"))
        .catch(() => setInitState("Failed"));
      return () => controller.abort();
    }
    return;
  }, [authenticationState, runtimeConfig]);

  return (
    <EncountersContext.Provider value={value}>
      {children}
    </EncountersContext.Provider>
  );
}

function useEncounters() {
  const context = use(EncountersContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useEncounters must be used within an EncountersProvider",
    );
  }

  const webApi = useWebApi();
  const [encounters, setEncounters] = context.encounters;
  const [initState] = context.initState;
  const [fetchState, setFetchState] = context.fetchState;

  const isLoadingMore = fetchState === "Fetching More";
  const canLoadMore = !isLoadingMore && fetchState !== "All Fetched";

  /** Gets an encounter if it exists and is loaded. */
  function get(id: string) {
    return encounters.find((e) => e.id === id);
  }

  /** Adds or replaces an encounter by id. */
  function put(id: string, encounter: Encounter) {
    setEncounters((encounters) =>
      [...encounters.filter((e) => e.id !== id), encounter].sort(
        byDate((e) => new Date(e.created), "Descending"),
      ),
    );
  }

  /** Updates an encounter. */
  function modify(id: string, update: (previous: Encounter) => Encounter) {
    setEncounters((encounters) =>
      encounters.map((e) => (e.id === id ? update(e) : e)),
    );
  }

  /**
   * Loads another batch of encounters.
   * If all encounters are loaded, or more are currently being loaded,
   * thisi function has no effect.
   */
  async function loadMore() {
    if (!canLoadMore) {
      return;
    }

    let earliestDate: Date | null = null;

    if (encounters.length > 0) {
      earliestDate = encounters
        .map((e) => new Date(e.created))
        .toSorted(byDate((dt) => dt))[0];
    }

    setFetchState("Fetching More");

    const page = await webApi.encounters.getAll(earliestDate);
    const moreEncounters = page.data.map((record) =>
      convertWebApiRecord.toEncounter(record),
    );

    setEncounters((encounters) =>
      [...encounters, ...moreEncounters].sort(
        byDate((e) => new Date(e.created), "Descending"),
      ),
    );

    setFetchState(page.isLastPage ? "All Fetched" : "Partially Fetched");
  }

  /**
   * Creates a new encounter record and persists it.
   *
   * Persistence Strategy: Synchronous.
   */
  async function create(tempId: string, audio: File, context?: string) {
    const modified = new Date().toISOString();
    const encounter = createEncounter(tempId, context);

    put(tempId, { ...encounter, modified });

    const record = await webApi.encounters.create(audio, context);
    const savedVersion = convertWebApiRecord.toEncounter(record);

    put(tempId, savedVersion);

    return savedVersion;
  }

  /**
   * Appends more audio to an existing recording and persists the change.
   *
   * Persistence Strategy: Synchronous.
   */
  async function appendRecording(id: string, audio: File) {
    const record = await webApi.encounters.appendAudio(id, audio);
    const savedVersion = convertWebApiRecord.toEncounter(record);

    put(id, savedVersion);

    return savedVersion;
  }

  /**
   * Removes an encounter and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function remove(id: string) {
    const encounter = get(id);

    if (!encounter) {
      return;
    }

    setEncounters((encounters) => [...encounters.filter((e) => e.id !== id)]);

    if (encounter.isPersisted) {
      webApi.encounters.deleteAndPurge(id);
    }
  }

  /**
   * Saves a note to an encounter and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function saveNote(id: string, note: DraftNote) {
    const modified = new Date().toISOString();

    modify(id, (encounter) => {
      // Update encounter notes.
      const draftNotes = [
        ...encounter.draftNotes.filter(
          (n) => n.definitionId !== note.definitionId,
        ),
        note,
      ].sort(byDate((n) => new Date(n.created), "Descending"));

      return { ...encounter, draftNotes, modified };
    });

    webApi.encounters.createDraftNote(
      id,
      note.definitionId,
      note.id,
      note.title,
      note.content,
      note.outputType,
    );
  }

  /**
   * Updates a recording's transcript and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function setTranscript(id: string, transcript: string) {
    const modified = new Date().toISOString();

    modify(id, (e) =>
      e.recording
        ? { ...e, recording: { ...e.recording, transcript }, modified }
        : e,
    );

    webApi.encounters.update(id, { transcript });
  }

  /**
   * Updates an encounter's label and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function setLabel(id: string, label: string | null) {
    const modified = new Date().toISOString();

    modify(id, (e) => ({ ...e, label, modified }));
    webApi.encounters.update(id, { label: label ?? undefined });
  }

  /**
   * Updates an encounter's text context and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function setContext(id: string, context: string | null) {
    const modified = new Date().toISOString();

    modify(id, (e) => ({ ...e, context, modified }));
    webApi.encounters.update(id, { context: context ?? "" });
  }

  /**
   * Sets or unsets a flag and associated comments on a note
   * and persists the change.
   *
   * Persistence Strategy: Optimistic.
   */
  function setNoteFlag(
    encounterId: string,
    noteId: string,
    isFlagged: boolean,
    comments: string | null,
  ) {
    const modified = new Date().toISOString();

    modify(encounterId, (encounter) => {
      const note = encounter?.draftNotes.find((n) => n.id === noteId);

      if (!note) {
        return encounter;
      }

      const draftNotes = [
        ...encounter.draftNotes.filter((n) => n.id !== noteId),
        { ...note, isFlagged, comments },
      ].sort(byDate((n) => new Date(n.created), "Descending"));

      return { ...encounter, draftNotes, modified };
    });

    webApi.encounters.setNoteFlag(encounterId, noteId, isFlagged, comments);
  }

  return {
    initState,
    isLoadingMore,
    canLoadMore,
    list: encounters,
    loadMore,
    create,
    appendRecording,
    remove,
    saveNote,
    setTranscript,
    setLabel,
    setContext,
    setNoteFlag,
  };
}

function useRawEncountersState() {
  const context = use(EncountersContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useEncounters must be used within an EncountersProvider",
    );
  }

  const [encounters, setEncounters] = context.encounters;
  const [initState] = context.initState;

  return {
    initState,
    list: encounters,
    setList: setEncounters,
  };
}

export { EncountersProvider, useEncounters, useRawEncountersState };
