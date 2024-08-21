import { useEffect, useRef } from "react";

import { useWebService } from "./use-web-service";

export const useAutoQuery = <T>(path: string) => {
  const { action, result } = useWebService<T>("GET", path);
  const { execute, reset, executing, error } = action;
  const retryTimer = useRef<NodeJS.Timeout | null>(null);

  // On initial mount, execute the query.
  useEffect(() => {
    execute();

    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }

      reset();
    };
  }, []);

  // If an error occurs that can be retried, keep trying after 3 seconds.
  useEffect(() => {
    if (error?.shouldRetry) {
      retryTimer.current = setTimeout(() => {
        execute();
        retryTimer.current = null;
      }, 3000);
    }
  }, [error]);

  return { data: result, loading: executing } as const;
};
