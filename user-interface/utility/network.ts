import { DataError, ValidationError, isValidationError } from "@/data-models";

import { logger } from "./logging";

const log = logger.child({ module: "utility/network" });

export const CORRELATION_ID_HEADER = "Jenkins-Correlation-Id";

export const UnexpectedError = (errorMessage: string): DataError => ({
  detail: {
    name: "Unexpected Error",
    message: errorMessage,
    shouldRetry: true,
  },
});

export const EnvironmentError = (errorMessage: string): DataError => ({
  detail: {
    name: "Environment Error",
    message: errorMessage,
    shouldRetry: false,
  },
});

export const BadRequest = (errorMessage: string): DataError => ({
  detail: {
    name: "Bad Response",
    message: errorMessage,
    shouldRetry: false,
  },
});

export const BadResponse = (errorMessage: string): DataError => ({
  detail: {
    name: "Bad Response",
    message: errorMessage,
    shouldRetry: true,
  },
});

export const ServerError = (errorMessage: string): DataError => ({
  detail: {
    name: "Server Error",
    message: errorMessage,
    shouldRetry: false,
  },
});

export const APIValidationFailed = (error: ValidationError): DataError => ({
  detail: {
    name: "Data Validation Error",
    message: JSON.stringify(error.detail),
    shouldRetry: false,
  },
});

export const ServerUnresponsiveError: DataError = {
  detail: {
    name: "Server Unavailable",
    message: "The server is currently not responding.",
    shouldRetry: true,
  },
};

export const TimeoutError: DataError = {
  detail: {
    name: "Server Timed Out",
    message: "The request timed out while waiting for the server to respond.",
    shouldRetry: true,
  },
};

export const RequestAborted: DataError = {
  detail: {
    name: "Request Aborted",
    message: "The request was aborted.",
    shouldRetry: false,
  },
};

function logFetchError(
  method: string,
  path: string,
  correlationId: string,
  error: Error,
) {
  const errorMessage = `Failed to Fetch ${method} ${path}: [${error.name}] ${error.message}`;

  log.error({ correlationId: correlationId }, errorMessage);
}

export async function performFetch(
  path: string,
  correlationId: string,
  init?: RequestInit,
) {
  const method = init?.method ?? "GET";

  log.trace(
    { correlationId: correlationId },
    `Performing Fetch ${method} ${path}`,
  );

  try {
    const response = await fetch(path, init);

    try {
      const status_code = response.status;
      let data = await response.json();

      // Convert any validation errors into standard form.
      if (isValidationError(data)) {
        data = APIValidationFailed(data);
      }

      log.trace(
        { correlationId: correlationId },
        `Fetch Success ${method} ${path}`,
      );

      return Response.json(data, { status: status_code });
    } catch (e: unknown) {
      // Failed to read response successfully.
      logFetchError(method, path, correlationId, e as Error);

      return Response.json(BadResponse((e as Error).message), { status: 500 });
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return Response.json(TimeoutError, { status: 504 });
    } else if (e instanceof DOMException && e.name === "AbortError") {
      return Response.json(RequestAborted, { status: 400 });
    } else if (e instanceof TypeError) {
      // Failed to fetch (i.e. server did not respond).
      logFetchError(method, path, correlationId, e);

      return Response.json(ServerUnresponsiveError, { status: 503 });
    } else {
      // Report any unexpected server errors.
      logFetchError(method, path, correlationId, e as Error);

      return Response.json(ServerError((e as Error).message), { status: 500 });
    }
  }
}
