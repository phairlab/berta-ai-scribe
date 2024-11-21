import { useRef } from "react";

import { useWebApi } from "@/services/web-api/use-web-api";
import * as convert from "@/utility/converters";

import { ApplicationState } from "./application-state-context";

const MONITOR_INTERVAL_MS = 5000;

export function useUpdateMonitor(applicationState: ApplicationState) {
  const webApi = useWebApi();

  const isMonitoring = useRef(false);
  const cutoff = useRef<Date>(new Date());
  const abortSignal = useRef<AbortSignal | null>(null);
  const onAbort = useRef<(() => void) | null>(null);

  const start = (cancellation: AbortSignal) => {
    if (isMonitoring.current) {
      return;
    }

    isMonitoring.current = true;
    cutoff.current = new Date();
    abortSignal.current = cancellation;

    abortSignal.current.onabort = () => {
      isMonitoring.current = false;
      abortSignal.current = null;
      onAbort.current?.();
    };

    monitorUpdates();
  };

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

        // Incorporate updates.
        changes.newEncounters.forEach((e) => {
          applicationState.encounters.put(convert.fromWebApiEncounter(e));
        });

        cutoff.current = changes.lastUpdate;
      } catch {
        // If error, skip this cycle.
      }
    }
  };

  return { start } as const;
}
