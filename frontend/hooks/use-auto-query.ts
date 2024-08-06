"use client";

import { useEffect, useRef } from "react";

import { logger } from "@/utility/logging";

import { useDataAction } from "./use-data-action";

const log = logger.child({ module: "hooks/use-auto-query" });

export const useAutoQuery = <T>(path: string) => {
  const { action, result } = useDataAction<T>("GET", path);
  const { execute, abort, executing, error, id } = action;
  const retryTimer = useRef<NodeJS.Timeout | null>(null);

  // On initial mount, execute the query.
  useEffect(() => {
    log.trace(
      { correlationId: id.current },
      `Executing Auto-Query GET ${path}`,
    );
    execute();

    return () => {
      log.trace(
        { correlationId: id.current },
        `Disposing Auto-Query GET ${path}`,
      );
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
        log.trace(
          { correlationId: id.current },
          `Retrying Auto-Query GET ${path}`,
        );
        execute();
        retryTimer.current = null;
      }, 3000);
    }
  }, [error]);

  return { data: result, loading: executing } as const;
};
