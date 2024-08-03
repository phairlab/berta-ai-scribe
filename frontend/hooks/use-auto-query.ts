"use client";

import { useEffect, useRef } from "react";

import { useDataAction } from "./use-data-action";

export const useAutoQuery = <T>(path: string) => {
  const { action, result } = useDataAction<T>(path, "GET");
  const { execute, abort, executing, error } = action;
  const retryTimer = useRef<NodeJS.Timeout | null>(null);

  // On initial mount, execute the query.
  useEffect(() => {
    execute();

    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }

      abort();
    };
  }, []);

  // If an error occurs that can be retried, keep trying after 3 seconds.
  useEffect(() => {
    if (error?.detail.shouldRetry) {
      retryTimer.current = setTimeout(() => {
        execute();
        retryTimer.current = null;
      }, 3000);
    }
  }, [error]);

  return { data: result, loading: executing } as const;
};
