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

import { NoteType } from "@/core/types";
import { authenticationStateAtom } from "@/services/identity";
import { useWebApi } from "@/services/web-api/use-web-api";
import { convertWebApiRecord } from "@/utility/conversion";
import { asApplicationError, InvalidOperationError } from "@/utility/errors";
import { alphabetically } from "@/utility/sorting";

import { useCurrentUser } from "./user-info-context";

type InitState = "Initializing" | "Ready" | "Failed";

type ContextValue = {
  noteTypes: [NoteType[], Dispatch<SetStateAction<NoteType[]>>];
  initState: [InitState, Dispatch<SetStateAction<InitState>>];
};

type ProviderProps = { children: ReactNode };

const NoteTypesContext = createContext<ContextValue | undefined>(undefined);

function NoteTypesProvider({ children }: ProviderProps) {
  const webApi = useWebApi();
  const authenticationState = useAtomValue(authenticationStateAtom);

  const [initState, setInitState] = useState<InitState>("Initializing");
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);

  const value: ContextValue = useMemo(
    () => ({
      noteTypes: [noteTypes, setNoteTypes],
      initState: [initState, setInitState],
    }),
    [noteTypes],
  );

  async function prefetch(abortSignal: AbortSignal) {
    const records = await webApi.noteDefinitions.getAll(abortSignal);
    const noteTypes = records
      .map((nt) => convertWebApiRecord.toNoteType(nt))
      .sort(alphabetically((nt) => nt.title));

    setNoteTypes(noteTypes);
  }

  useEffect(() => {
    if (authenticationState === "Authenticated") {
      const controller = new AbortController();

      setInitState("Initializing");
      prefetch(controller.signal)
        .then(() => setInitState("Ready"))
        .catch(() => setInitState("Failed"));

      return () => controller.abort();
    }

    return;
  }, [authenticationState]);

  return (
    <NoteTypesContext.Provider value={value}>
      {children}
    </NoteTypesContext.Provider>
  );
}

function useNoteTypes() {
  const context = use(NoteTypesContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useNoteTypes must be used within a NoteTypesProvider",
    );
  }

  const webApi = useWebApi();
  const userInfo = useCurrentUser();
  const [noteTypes, setNoteTypes] = context.noteTypes;
  const [initState] = context.initState;

  const derivedInitState: InitState =
    initState === "Ready" && userInfo.initState === "Ready"
      ? "Ready"
      : initState === "Failed" || userInfo.initState === "Failed"
        ? "Failed"
        : "Initializing";

  const builtin = noteTypes.filter((nt) => nt.isBuiltin);
  const custom = noteTypes.filter((nt) => !nt.isBuiltin);

  const userDefault = noteTypes.find(
    (nt) => nt.id === userInfo.settings.defaultNoteType,
  );
  const systemDefault = noteTypes.find((nt) => nt.isSystemDefault);
  const fallbackDefault = noteTypes.length > 0 ? noteTypes[0] : undefined;

  /** Gets a note type if it exists. */
  function get(id: string) {
    return custom.find((nt) => nt.id === id);
  }

  /** Adds or replaces a note type by id. */
  function put(id: string, noteType: NoteType) {
    setNoteTypes((noteTypes) => [
      ...noteTypes.filter((nt) => nt.id !== id),
      noteType,
    ]);
  }

  /**
   * Saves a custom note type and persists the changes.
   *
   * Persistence Strategy: Synchronous.
   */
  async function save(noteType: NoteType) {
    const modified = new Date().toISOString();
    const id = noteType.id;
    const existingVersion = get(id);

    if (existingVersion && existingVersion.isBuiltin) {
      throw new InvalidOperationError("Cannot modify a built-in note type");
    }

    put(id, { ...noteType, isSaving: true, modified });

    try {
      let savedVersion: NoteType;

      if (existingVersion) {
        const record = await webApi.noteDefinitions.update(id, {
          title: noteType.title,
          instructions: noteType.instructions,
          model: noteType.model,
        });

        savedVersion = convertWebApiRecord.toNoteType(record);
      } else {
        const record = await webApi.noteDefinitions.create(
          noteType.title,
          noteType.instructions,
          noteType.model,
        );

        savedVersion = convertWebApiRecord.toNoteType(record);
      }

      put(id, savedVersion);

      return savedVersion;
    } catch (ex: unknown) {
      const failedVersion = {
        ...noteType,
        isSaving: false,
        saveError: asApplicationError(ex),
        modified,
      };

      put(id, failedVersion);

      return failedVersion;
    }
  }

  /**
   * Removes a custom note type and deletes its record.
   *
   * Persistence Strategy: Optimistic.
   */
  function remove(id: string) {
    const noteType = get(id);

    if (noteType) {
      if (noteType.isBuiltin) {
        throw new InvalidOperationError("Cannot remove a built-in note type");
      }

      setNoteTypes((noteTypes) => [...noteTypes.filter((nt) => nt.id !== id)]);

      if (!noteType.isNew) {
        webApi.noteDefinitions.discard(id);
      }
    }
  }

  return {
    initState: derivedInitState,
    builtin,
    custom,
    default: userDefault ?? systemDefault ?? fallbackDefault,
    save,
    remove,
  };
}

function useRawNoteTypesState() {
  const context = use(NoteTypesContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useNoteTypes must be used within a NoteTypesProvider",
    );
  }

  const [noteTypes, setNoteTypes] = context.noteTypes;
  const [initState] = context.initState;

  return {
    initState,
    list: noteTypes,
    setList: setNoteTypes,
  };
}

export { NoteTypesProvider, useNoteTypes, useRawNoteTypesState };
