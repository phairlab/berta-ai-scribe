import { useRef, useState } from "react";

import { ApplicationError, UnexpectedError } from "@/utility/errors";
import { webServiceFetch } from "@/utility/network";

export const useWebService = <T>(method: "GET" | "POST", path: string) => {
  const [result, setResult] = useState<T>();
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<ApplicationError>();
  const controller = useRef<AbortController | null>();

  const abort = () => {
    if (controller.current) {
      controller.current.abort(
        new DOMException("Request aborted.", "AbortError"),
      );

      controller.current = null;
    }
  };

  const reset = () => {
    abort();
    setResult(undefined);
    setError(undefined);
  };

  const execute = async (data?: FormData | Object, timeout?: number) => {
    // If a fetch is already in progress, throw an error.
    if (controller.current) {
      const errorMessage = `Attempt to re-execute an action in progress. First abort or wait for the action to complete (${method} ${path}).`;

      throw new Error(errorMessage);
    }

    // Reset state.
    setResult(undefined);
    setError(undefined);
    setExecuting(true);

    // Set up cancellation.
    const activeController = new AbortController();
    const abortSignal = activeController.signal;
    let activeTimeout: NodeJS.Timeout | null = null;

    // Set up and start timeout (if applicable).
    if (timeout) {
      activeTimeout = setTimeout(() => {
        activeController.abort(
          new DOMException("Request timed out.", "TimeoutError"),
        );
      }, timeout * 1000);
    }

    // Publish controller to allow abort from this point.
    controller.current = activeController;

    // Set up request data.
    let requestHeaders: HeadersInit = {};

    if (!(data instanceof FormData)) {
      requestHeaders = {
        ...requestHeaders,
        "Content-Type": "application/json",
      };
    }

    let init: RequestInit = {
      method: method ?? "GET",
      signal: abortSignal,
      headers: requestHeaders,
      body: data instanceof FormData ? data : JSON.stringify(data),
    };

    // Perform fetch.
    try {
      const response = await webServiceFetch(path, init);
      const data = await response.json();

      if (response.ok) {
        setResult(data as T);
      } else {
        const error = data as ApplicationError;

        setError(error);
      }
    } catch (e: unknown) {
      setError(UnexpectedError((e as Error).message));
    } finally {
      controller.current = null;

      if (activeTimeout) {
        clearTimeout(activeTimeout);
      }

      setExecuting(false);
    }
  };

  return {
    action: { execute, abort, reset, executing, error },
    result,
  } as const;
};
