"use client";

import { useRef, useState } from "react";
import suuid from "short-uuid";

import { logger } from "@/utility/logging";
import { DataError, isDataError } from "@/data-models";
import * as Network from "@/utility/network";

const log = logger.child({ module: "hooks/use-data-action" });

export const useDataAction = <T>(
  path: string,
  method?: "GET" | "POST",
  parameters?: { [field: string]: string | File | null },
) => {
  const [result, setResult] = useState<T | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<DataError | null>(null);
  const controller = useRef<AbortController | null>();
  const id = useRef<string>(suuid.generate());

  const abort = () => {
    log.trace(
      { correlationId: id.current },
      `Aborting Action ${method} ${path}`,
    );

    if (controller.current) {
      controller.current.abort(
        new DOMException("Request aborted.", "AbortError"),
      );

      controller.current = null;
    }
  };

  const execute = async (timeout?: number) => {
    log.trace(
      { correlationId: id.current },
      `Executing Action ${method} ${path}${timeout ? ` (timeout: ${timeout}s)` : ""}`,
    );

    // If a fetch is already in progress, cancel it first.
    if (controller.current) {
      controller.current.abort();
    }

    // Reset state.
    setResult(null);
    setError(null);
    setExecuting(true);

    // Set up cancellation.
    const activeController = new AbortController();
    const abortSignal = activeController.signal;
    let activeTimeout: NodeJS.Timeout | null = null;

    // Set up and start timeout (if applicable).
    if (timeout) {
      activeTimeout = setTimeout(() => {
        log.trace(
          { correlationId: id.current },
          `Action Timed Out ${method} ${path}`,
        );
        activeController.abort(
          new DOMException("Request timed out.", "TimeoutError"),
        );
      }, timeout * 1000);
    }

    // Publish controller to allow abort from this point.
    controller.current = activeController;

    // Set up request data.
    let init: RequestInit = {
      method: method ?? "GET",
      signal: abortSignal,
      headers: { [Network.CORRELATION_ID_HEADER]: id.current },
    };

    if (method === "POST" && parameters) {
      const formData = new FormData();

      for (const field in parameters) {
        if (parameters[field] !== null) {
          formData.append(field, parameters[field]);
        }
      }

      init = { ...init, body: formData };
    }

    // Perform fetch.
    try {
      const response = await Network.clientFetch(path, id.current, init);
      const data = await response.json();

      if (response.ok) {
        log.trace(
          { correlationId: id.current },
          `Action Succeeded ${method} ${path}`,
        );
        setResult(data as T);
      } else {
        // Ensure the error response is in the correct format.
        // Problem here requires checking and correcting an issue in the application code.
        if (!isDataError(data)) {
          const errorMessage = `The server returned an error in an invalid format. Error Details: ${JSON.stringify(data)}`;

          log.trace(
            { correlationId: id.current },
            `Unexpected Error ${method} ${path}: ${errorMessage}`,
          );

          throw new Error(errorMessage);
        }

        const error = data as DataError;

        if (error.detail.name === "Request Aborted") {
          // Don't update data/error on abort, leave it as default.
        } else {
          log.trace(
            { correlationId: id.current, error: error },
            `Action Returned Error  ${method} ${path}`,
          );
          setError(error);
        }
      }
    } catch (e: unknown) {
      // Log and report unexpected errors.
      log.trace(
        { correlationId: id.current },
        `Unexpected Error ${method} ${path}: ${(e as Error).message}`,
      );

      setError(Network.UnexpectedError((e as Error).message));
    } finally {
      controller.current = null;

      if (activeTimeout) {
        clearTimeout(activeTimeout);
      }

      setExecuting(false);
    }
  };

  return { action: { execute, abort, executing, error, id }, result } as const;
};
