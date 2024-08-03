import { DataError, ValidationError, isValidationError } from "@/data-models";

export const UnexpectedError = (error_message: string): DataError => ({
  detail: {
    name: "Unexpected Error",
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

const NetworkInterruptedError: DataError = {
  detail: {
    name: "Network Interrupted",
    message: "The network was interrupted while waiting for a response.",
    shouldRetry: true,
  },
};

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

async function controlledFetch(path: string, init?: RequestInit) {
  try {
    const response = await fetch(path, init);

    try {
      const status_code = response.status;
      let data = await response.json();

      // Convert any validation errors into standard form.
      if (isValidationError(data)) {
        data = APIValidationFailed(data);
      }

      return Response.json(data, { status: status_code });
    } catch {
      // Failed to read response successfully.
      return Response.json(NetworkInterruptedError, { status: 503 });
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return Response.json(TimeoutError, { status: 504 });
    } else if (e instanceof DOMException && e.name === "AbortError") {
      return Response.json(RequestAborted, { status: 400 });
    } else if (e instanceof TypeError) {
      // Failed to fetch (i.e. server did not respond).
      return Response.json(ServerUnresponsiveError, { status: 503 });
    } else {
      // Report any unexpected server errors.
      return Response.json(ServerError((e as Error).message), { status: 500 });
    }
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const apiUrlBase = process.env.APP_API_URL;

  if (!apiUrlBase) {
    throw new Error(
      "The apiFetch utility function can only be used within a server component.",
    );
  }

  return controlledFetch(`${apiUrlBase}/${path}`, init);
}

export function clientFetch(path: string, init?: RequestInit) {
  "use client";

  return controlledFetch(`data/${path}`, init);
}

export async function downloadFile(path: string, filename: string) {
  const response = await fetch(path);
  const data = await response.blob();
  const file = new File([data], filename, { type: data.type });

  return file;
}
