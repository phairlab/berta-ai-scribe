import { ReactNode, useEffect, useMemo, useRef } from "react";

import { Encounter, Recording } from "@/core/types";
import * as WebApiTypes from "@/services/web-api/types";
import { useWebApi } from "@/services/web-api/use-web-api";
import { convertWebApiRecord } from "@/utility/conversion";
import { alphabetically, byDate } from "@/utility/sorting";
import { useAbortController } from "@/utility/use-abort-controller";

import { useRawEncountersState } from "./encounters-context";
import { useRawNoteTypesState } from "./note-types-context";
import { useRawUserInfoState } from "./user-info-context";

const MONITOR_INTERVAL_MS = 7000;

type MonitorProps = { children: ReactNode };

export const ExternalStateMonitor = ({ children }: MonitorProps) => {
  const userInfo = useRawUserInfoState();
  const encounters = useRawEncountersState();
  const noteTypes = useRawNoteTypesState();

  const webApi = useWebApi();
  const abortController = useAbortController();

  const isMonitoring = useRef(false);
  const cutoff = useRef<Date>(new Date());
  const abortSignal = useRef<AbortSignal>(abortController.signal.current);
  const onAbort = useRef<(() => void) | null>(null);

  const isStateReady = useMemo(
    () =>
      userInfo.initState == "Ready" &&
      encounters.initState == "Ready" &&
      noteTypes.initState == "Ready",
    [userInfo.initState, encounters.initState, noteTypes.initState],
  );

  function earlierThan(a: string, b: string) {
    return new Date(a).getTime() < new Date(b).getTime();
  }

  /**
   * Begins the monitoring process when state is ready.
   * Aborts and stops monitoring when hook is unloaded.
   */
  useEffect(() => {
    if (!isStateReady) {
      if (isMonitoring.current) {
        abortController.abort();
      }

      return;
    }

    isMonitoring.current = true;
    cutoff.current = new Date();

    abortSignal.current.onabort = () => {
      isMonitoring.current = false;
      abortSignal.current = abortController.signal.current;
      onAbort.current?.();
    };

    monitorUpdates();

    return () => abortController.abort();
  }, [isStateReady]);

  /**
   * Defines the monitoring loop.
   * The wait period for each loop iteration does not
   * begin until the previous iteration's work has
   * completed in its entirety.
   * Therefore the loop repeat duration defines a
   * minimum and not a constant between iterations.
   */
  const monitorUpdates = async () => {
    while (abortSignal.current && !abortSignal.current.aborted) {
      try {
        // Wait for prescribed interval.
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve();
            onAbort.current = null; // Stop watching for abort signal this cycle.
          }, MONITOR_INTERVAL_MS);

          // Reject if abort signalled.
          onAbort.current = () => {
            clearTimeout(timeout);
            reject();
          };
        });
      } catch {
        // If aborted, exit the monitor loop.
        break;
      }

      // Check for updates.
      try {
        const changes = await webApi.monitoring.checkDataChanges(
          cutoff.current,
          abortSignal.current,
        );

        if (changes) {
          // Incorporate updates.

          // MODIFIED USER INFO
          if (changes.userInfo) {
            if (abortSignal.current.aborted) {
              return;
            }

            const external = convertWebApiRecord.toUserInfo(changes.userInfo);
            const local = userInfo.value;

            if (earlierThan(local.modified, external.modified)) {
              userInfo.setValue((local) => ({ ...local, ...external }));
            }
          }

          // NEW NOTE DEFINITIONS
          for (const created of changes.noteDefinitions.created) {
            if (abortSignal.current.aborted) {
              return;
            }

            const external = convertWebApiRecord.toNoteType(created);

            noteTypes.setList((noteTypes) =>
              [...noteTypes, external].sort(alphabetically((nt) => nt.title)),
            );
          }

          // MODIFIED NOTE DEFINITIONS
          for (const modified of changes.noteDefinitions.modified) {
            if (abortSignal.current.aborted) {
              return;
            }

            const external = modified;

            noteTypes.setList((noteTypes) =>
              noteTypes.map((local) =>
                local.id === external.id &&
                earlierThan(local.modified, external.modified)
                  ? { ...local, ...external }
                  : local,
              ),
            );
          }

          // REMOVED NOTE DEFINITIONS
          for (const deleted of changes.noteDefinitions.removed) {
            if (abortSignal.current.aborted) {
              return;
            }

            noteTypes.setList((noteTypes) => [
              ...noteTypes.filter((nt) => nt.id !== deleted.id),
            ]);
          }

          // NEW ENCOUNTERS
          for (const created of changes.encounters.created) {
            if (abortSignal.current.aborted) {
              return;
            }

            const external = convertWebApiRecord.toEncounter(created);

            encounters.setList((encounters) =>
              [...encounters, external].sort(
                byDate((e) => new Date(e.created), "Descending"),
              ),
            );
          }

          // MODIFIED ENCOUNTERS
          for (const modified of changes.encounters.modified) {
            if (abortSignal.current.aborted) {
              return;
            }

            const external = modified;

            encounters.setList((encounters) =>
              encounters.map((local) => {
                if (local.id === external.id) {
                  // Merge notes from local and external.
                  const draftNotes = Object.values(
                    [...local.draftNotes, ...external.draftNotes]
                      .sort(byDate((n) => new Date(n.created)))
                      .reduce(
                        (notes, note) => ({
                          ...notes,
                          [note.definitionId]: note,
                        }),
                        {} as { [key: string]: WebApiTypes.DraftNote },
                      ),
                  ).sort(byDate((n) => new Date(n.created), "Descending"));

                  const [earlier, later] = [local, external].toSorted(
                    byDate((e) => new Date(e.modified)),
                  );

                  return {
                    ...local,
                    autolabel: later.autolabel ?? earlier.autolabel,
                    label: later.label ?? earlier.label,
                    recording: {
                      ...local.recording!,
                      transcript:
                        later.recording?.transcript ??
                        earlier.recording?.transcript ??
                        null,
                    } satisfies Recording as Recording,
                    draftNotes,
                  } satisfies Encounter;
                } else {
                  return local;
                }
              }),
            );
          }

          // REMOVED ENCOUNTERS
          for (const deleted of changes.encounters.removed) {
            if (abortSignal.current.aborted) {
              return;
            }

            encounters.setList((encounters) => [
              ...encounters.filter((e) => e.id !== deleted.id),
            ]);
          }

          cutoff.current = new Date(changes.lastUpdate);
        }
      } catch (ex: unknown) {
        // If error, skip this cycle.
      }
    }
  };

  return children;
};
