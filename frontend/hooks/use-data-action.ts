"use client";

import { useRef, useState } from "react";

import { DataError, isDataError } from "@/data-models";
import { clientFetch, UnexpectedError } from "@/utility/network";

export const useDataAction = <T>(
  path: string,
  method?: "GET" | "POST",
  parameters?: { [field: string]: string | File | null },
) => {
  const [result, setResult] = useState<T | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<DataError | null>(null);
  const controller = useRef<AbortController | null>();

  const abort = () => {
    if (controller.current) {
      controller.current.abort(
        new DOMException("Request aborted.", "AbortError"),
      );

      controller.current = null;
    }
  };

  const execute = async (timeout?: number) => {
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
      activeTimeout = setTimeout(
        () =>
          activeController.abort(
            new DOMException("Request timed out.", "TimeoutError"),
          ),
        timeout * 1000,
      );
    }

    // Publish controller to allow abort from this point.
    controller.current = activeController;

    // Set up request data.
    let init: RequestInit = {
      method: method ?? "GET",
      signal: abortSignal,
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
      const response = await clientFetch(path, init);
      const data = await response.json();

      if (response.ok) {
        setResult(data as T);
      } else {
        // Ensure the error response is in the correct format.
        // Problem here requires checking and correcting an issue in the application code.
        if (!isDataError(data)) {
          throw new Error(
            `The server returned an error in an invalid format. Error Details: ${JSON.stringify(data)}`,
          );
        }

        const error = data as DataError;

        if (error.detail.name === "Request Aborted") {
          // Don't update data/error on abort, leave it as default.
        } else {
          setError(error);
        }
      }
    } catch (e: unknown) {
      // Report any unexpected errors.
      setError(UnexpectedError((e as Error).message));
    } finally {
      controller.current = null;

      if (activeTimeout) {
        clearTimeout(activeTimeout);
      }

      setExecuting(false);
    }
  };

  return { action: { execute, abort, executing, error }, result } as const;
};
