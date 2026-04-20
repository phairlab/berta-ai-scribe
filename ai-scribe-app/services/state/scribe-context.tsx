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

import {
  NoteType,
  ScribeAction,
  ScribeError,
  ScribeOutput,
  ScribeTrackedEncounter,
} from "@/core/types";
import { InvalidOperationError } from "@/utility/errors";

import { useEncounters } from "./encounters-context";

type ScribeEncounters = { [id: string]: ScribeTrackedEncounter };

type ContextValue = {
  tracked: [ScribeEncounters, Dispatch<SetStateAction<ScribeEncounters>>];
};

type ProviderProps = { children: ReactNode };

const ScribeStateContext = createContext<ContextValue | undefined>(undefined);

function ScribeStateProvider({ children }: ProviderProps) {
  const [encounters, setEncounters] = useState<ScribeEncounters>({});

  const value: ContextValue = useMemo(
    () => ({ tracked: [encounters, setEncounters] }),
    [encounters],
  );

  return (
    <ScribeStateContext.Provider value={value}>
      {children}
    </ScribeStateContext.Provider>
  );
}

function useScribe() {
  const context = use(ScribeStateContext);

  if (context === undefined) {
    throw new InvalidOperationError(
      "useScribeState must be used within a ScribeStateContext",
    );
  }

  const { list: encounters } = useEncounters();

  useEffect(
    () =>
      encounters.forEach((e) => {
        if (!(e.id in tracked)) {
          track(e.id);
        }
      }),
    [encounters],
  );

  const [tracked, setTracked] = context.tracked;

  function modify(
    id: string,
    update: (previous: ScribeTrackedEncounter) => ScribeTrackedEncounter,
  ) {
    setTracked((encounters) => {
      if (id in encounters) {
        const encounter = encounters[id];

        return { ...encounters, [id]: update(encounter) };
      } else {
        return encounters;
      }
    });
  }

  function get(id: string | undefined) {
    return id && id in tracked ? tracked[id] : {};
  }

  function track(id: string) {
    setTracked((encounters) => ({ ...encounters, [id]: {} }));
  }

  function modifyId(oldId: string, newId: string) {
    setTracked((encounters) => {
      if (oldId in encounters) {
        const updated = { ...encounters, [newId]: encounters[oldId] };

        delete updated[oldId];

        return updated;
      } else {
        return encounters;
      }
    });
  }

  function setNoteType(id: string, noteType: NoteType) {
    modify(id, (e) => ({ ...e, noteType }));
  }

  function setAction(id: string, action: ScribeAction) {
    modify(id, (e) => ({ ...e, action }));
  }

  function setError(id: string, error: ScribeError) {
    modify(id, (e) => ({ ...e, error }));
  }

  function setOutput(id: string, output?: ScribeOutput) {
    modify(id, (e) => ({ ...e, output }));
  }

  function clearNoteType(id: string) {
    modify(id, (e) => ({ ...e, noteType: undefined }));
  }

  function clearAction(id: string) {
    modify(id, (e) => ({ ...e, action: undefined }));
  }

  function clearError(id: string) {
    modify(id, (e) => ({ ...e, error: undefined }));
  }

  return {
    get,
    track,
    modifyId,
    setNoteType,
    setAction,
    setError,
    setOutput,
    clearNoteType,
    clearAction,
    clearError,
  };
}

export { ScribeStateProvider, useScribe };
