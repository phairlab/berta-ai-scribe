import suuid from "short-uuid";

import { logger } from "./logging";

import { DataError, ValidationError, isValidationError } from "@/data-models";

const log = logger.child({ module: "utility/network" });

export const CORRELATION_ID_HEADER = "Jenkins-Correlation-Id";

export const UnexpectedError = (error_message: string): DataError => ({
  detail: {
    name: "Unexpected Error",
    message: error_message,
    shouldRetry: false,
  },
});

export const EnvironmentError = (error_message: string): DataError => ({
  detail: {
    name: "Environment Error",
    message: error_message,
    shouldRetry: false,
  },
});

const ServerError = (error_message: string): DataError => ({
  detail: {
    name: "Server Error",
    message: error_message,
    shouldRetry: false,
  },
});

const APIValidationFailed = (error: ValidationError): DataError => ({
  detail: {
    name: "Data Validation Error",
    message: JSON.stringify(error.detail),
    shouldRetry: false,
  },
});

const ServerUnresponsiveError: DataError = {
  detail: {
    name: "Server Unavailable",
    message: "The server is currently not responding.",
    shouldRetry: true,
  },
};

const BadResponse = (error_message: string): DataError => ({
  detail: {
    name: "Bad Response",
    message: error_message,
    shouldRetry: true,
  },
});

const TimeoutError: DataError = {
  detail: {
    name: "Server Timed Out",
    message: "The request timed out while waiting for the server to respond.",
    shouldRetry: true,
  },
};

const RequestAborted: DataError = {
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
  const errorMessage = `Fetch Failure ${method} ${path}: [${error.name}] ${error.message}`;

  log.error({ correlationId: correlationId }, errorMessage);
}

async function performFetch(
  path: string,
  correlationId: string,
  init?: RequestInit,
) {
  const method = init?.method || "GET";

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

export async function APIFetch(
  path: string,
  correlationId: string,
  init?: RequestInit,
) {
  const apiUrlBase = process.env.APP_API_URL;
  const fullPath = `${apiUrlBase}/${path}`;

  if (!apiUrlBase) {
    const error_message =
      "Either the environment was not set correctly, or an API fetch was attempted from a client component.";

    log.error(error_message);

    return Response.json(EnvironmentError(error_message), { status: 400 });
  }

  const method = init?.method || "GET";

  log.trace(
    { correlationId: correlationId },
    `API ${method} ${fullPath} Request`,
  );

  const start = performance.now();
  const response = await performFetch(fullPath, correlationId, init);
  const duration = Math.floor(performance.now() - start);

  log.info(
    { correlationId: correlationId },
    `API ${method} ${fullPath} ${response.status} in ${duration}ms`,
  );

  return response;
}

export async function clientFetch(
  path: string,
  correlationId: string,
  init?: RequestInit,
) {
  "use client";
  const fullPath = `/data/${path}`;
  const method = init?.method || "GET";

  log.trace(
    { correlationId: correlationId },
    `CLIENT ${method} ${fullPath} Request`,
  );

  const start = performance.now();
  const response = await performFetch(fullPath, correlationId, init);
  const duration = Math.floor(performance.now() - start);

  log.info(
    { correlationId: correlationId },
    `CLIENT ${method} ${fullPath} ${response.status} in ${duration}ms`,
  );

  return response;
}

export async function downloadFile(path: string, filename: string) {
  "use client";

  const correlationId = suuid.generate();

  log.trace({ correlationId: correlationId }, `CLIENT DOWNLOAD ${path}`);

  try {
    const start = performance.now();
    const response = await fetch(path);

    if (response.ok) {
      const data = await response.blob();
      const duration = Math.floor(performance.now() - start);

      const file = new File([data], filename, { type: data.type });

      log.info(
        { correlationId: correlationId, mimeType: data?.type },
        `CLIENT DOWNLOAD ${path} ${response.status} in ${duration}ms`,
      );

      return file;
    } else {
      const duration = Math.floor(performance.now() - start);

      log.info(
        { correlationId: correlationId },
        `CLIENT DOWNLOAD ${path} ${response.status} in ${duration}ms`,
      );

      const errorMessage = await response.text();

      throw new Error(errorMessage);
    }
  } catch (e: unknown) {
    log.error(
      { correlationId: correlationId },
      `CLIENT DOWNLOAD FAILED: [${(e as Error).name}] ${(e as Error).message}`,
    );

    throw e;
  }
}
