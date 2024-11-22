import { PropsWithChildren, use, useEffect, useMemo, useRef } from "react";

import { Encounter } from "@/core/types";
import * as webApiTypes from "@/services/web-api/types";
import { useWebApi } from "@/services/web-api/use-web-api";
import * as convert from "@/utility/converters";
import { byDate } from "@/utility/sorters";
import { setTracking, WithTracking } from "@/utility/tracking";
import { useAbortController } from "@/utility/use-abort-controller";

import { ApplicationStateContext } from "./application-state-context";

const MONITOR_INTERVAL_MS = 10000;
const DEFERRAL_MS = 500;

export const ExternalStateMonitor = ({ children }: PropsWithChildren) => {
  const applicationState = use(ApplicationStateContext);
  const webApi = useWebApi();
  const abortController = useAbortController();

  const encounters = useRef(applicationState.encounters);
  const noteTypes = useRef(applicationState.noteTypes);
  const isMonitoring = useRef(false);
  const cutoff = useRef<Date>(new Date());
  const abortSignal = useRef<AbortSignal>(abortController.signal.current);
  const onAbort = useRef<(() => void) | null>(null);

  const isStateReady = useMemo(
    () =>
      applicationState.encounters.status == "Ready" &&
      applicationState.noteTypes.status == "Ready",
    [applicationState.encounters.status, applicationState.noteTypes.status],
  );

  useEffect(() => {
    encounters.current = applicationState.encounters;
  }, [applicationState.encounters]);

  useEffect(() => {
    noteTypes.current = applicationState.noteTypes;
  }, [applicationState.noteTypes]);

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

  /** Applies an effect to the target once it is saved. */
  async function whenSaved<T>(
    getTarget: () => WithTracking<T> | undefined,
    apply: (target: WithTracking<T>) => void,
  ) {
    while (abortSignal.current?.aborted === false) {
      const target = getTarget();

      if (target === undefined) {
        break;
      }

      if (target.tracking.isSaved) {
        apply(target);
        break;
      }

      await new Promise<void>((resolve) =>
        setTimeout(() => resolve(), DEFERRAL_MS),
      );
    }
  }

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

          // Updates to existing records are deferred
          // until that existing record is saved and settled, and
          // only applied if the imported version is more current
          // than the existing one.

          // MODIFIED USER INFO
          if (changes.userInfo && changes.userInfo.defaultNoteType) {
            noteTypes.current.setDefault(
              changes.userInfo.defaultNoteType,
              new Date(changes.userInfo.updated),
            );
          }

          // NEW NOTE DEFINITIONS
          for (const created of changes.noteDefinitions.created) {
            if (abortSignal.current.aborted) {
              return;
            }

            noteTypes.current.put(convert.fromWebApiNoteType(created));
          }

          // MODIFIED NOTE DEFINITIONS
          for (const modified of changes.noteDefinitions.modified) {
            if (abortSignal.current.aborted) {
              return;
            }

            await whenSaved(
              () => noteTypes.current.get(modified.id),
              (previous) => {
                if (
                  new Date(previous.modified).getTime() <
                  new Date(modified.modified).getTime()
                ) {
                  noteTypes.current.put(convert.fromWebApiNoteType(modified));
                }
              },
            );
          }

          // REMOVED NOTE DEFINITIONS
          for (const deleted of changes.noteDefinitions.removed) {
            if (abortSignal.current.aborted) {
              return;
            }

            await whenSaved(
              () => noteTypes.current.get(deleted.id),
              () => noteTypes.current.remove(deleted.id),
            );
          }

          // NEW ENCOUNTERS
          for (const created of changes.encounters.created) {
            if (abortSignal.current.aborted) {
              return;
            }

            encounters.current.put(convert.fromWebApiEncounter(created));
          }

          // MODIFIED ENCOUNTERS
          for (const modified of changes.encounters.modified) {
            if (abortSignal.current.aborted) {
              return;
            }

            await whenSaved(
              () => encounters.current.get(modified.id),
              (previous) => {
                // Get the distinct set of notes from both previous and modified encounters.
                const notes = Object.values(
                  [...previous.draftNotes, ...modified.draftNotes]
                    .sort(byDate((n) => new Date(n.created)))
                    .reduce(
                      (notes, note) => ({ ...notes, [note.id]: note }),
                      {} as { [key: string]: webApiTypes.DraftNote },
                    ),
                );

                const isNewer =
                  new Date(previous.modified).getTime() <
                  new Date(modified.modified).getTime();

                // Take the newer version of the encounter, but update
                // with the combined set of notes.
                if (isNewer) {
                  encounters.current.put(
                    convert.fromWebApiEncounter({
                      ...modified,
                      draftNotes: notes,
                    }),
                  );
                } else {
                  encounters.current.put(
                    setTracking(
                      { ...previous, draftNotes: notes } as Encounter,
                      "Synchronized",
                    ),
                  );
                }
              },
            );
          }

          // REMOVED ENCOUNTERS
          for (const deleted of changes.encounters.removed) {
            if (abortSignal.current.aborted) {
              return;
            }

            await whenSaved(
              () => encounters.current.get(deleted.id),
              () => encounters.current.remove(deleted.id),
            );
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
