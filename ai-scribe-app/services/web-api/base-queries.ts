import { headerNames } from "@/config/keys";
import * as Errors from "@/utility/errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function httpAction<T>(
  method: HttpMethod,
  path: string,
  parameters?: Partial<{
    accessToken: string;
    data: FormData | Object;
    signal: AbortSignal;
  }>,
): Promise<T> {
  try {
    let requestHeaders: HeadersInit | undefined;

    if (parameters?.accessToken) {
      requestHeaders = {
        ...requestHeaders,
        [headerNames.JenkinsAuthorization]: `Bearer ${parameters.accessToken}`,
      };
    }

    if (parameters?.data && !(parameters.data instanceof FormData)) {
      requestHeaders = {
        ...(requestHeaders ?? {}),
        "Content-Type": "application/json",
      };
    }

    let body: BodyInit | undefined;

    if (parameters?.data) {
      body =
        parameters.data instanceof FormData
          ? parameters.data
          : JSON.stringify(parameters.data);
    }

    const init: RequestInit = {
      method: method,
      signal: parameters?.signal,
      headers: requestHeaders,
      body: body,
    };

    const response = await fetch(path, init);

    try {
      const data: T =
        response.headers.get("Content-Type") === "application/json"
          ? ((await response.json()) as T)
          : ((await response.text()) as T);

      if (response.ok) {
        return data;
      } else {
        // Convert any server error responses into a standard format.
        if (Errors.isWebApiError(data)) {
          if (
            Array.isArray(data.detail) &&
            data.detail.every((e) => Errors.isServerValidationError(e))
          ) {
            // Convert multi-validation errors from server format.
            throw Errors.ValidationError(data.detail);
          } else if (Errors.isServerValidationError(data.detail)) {
            // Convert single-validation errors from server format.
            throw Errors.ValidationError([data.detail]);
          } else if (Errors.isApplicationError(data.detail)) {
            // This is the normal, expected type of error the web API would return.
            throw data.detail;
          } else {
            // Handle real web API errors that are not in the normal form.
            throw Errors.ServerError(
              typeof data.detail === "string"
                ? data.detail
                : JSON.stringify(data.detail),
            );
          }
        } else {
          // Handle cases where an error is emitted in an unexpected format, for example a severe Internal Server Error.
          throw Errors.ServerError(
            typeof data === "string" ? data : JSON.stringify(data),
          );
        }
      }
    } catch (e: unknown) {
      if (Errors.isApplicationError(e)) {
        throw e;
      } else {
        throw Errors.BadResponse((e as Error).message);
      }
    }
  } catch (e: unknown) {
    if (Errors.isApplicationError(e)) {
      throw e;
    } else if (e instanceof DOMException && e.name === "TimeoutError") {
      throw Errors.TimeoutError;
    } else if (e instanceof DOMException && e.name === "AbortError") {
      throw Errors.RequestAborted;
    } else if (e instanceof TypeError) {
      throw Errors.ServerUnresponsiveError;
    } else {
      throw Errors.UnexpectedError((e as Error).message);
    }
  }
}

export async function downloadFile(
  path: string,
  filename: string,
  accessToken?: string,
  abortSignal?: AbortSignal,
) {
  let requestHeaders: HeadersInit = {};

  if (accessToken) {
    requestHeaders = {
      ...requestHeaders,
      [headerNames.JenkinsAuthorization]: `Bearer ${accessToken}`,
    };
  }

  try {
    const response = await fetch(path, {
      headers: requestHeaders,
      signal: abortSignal,
    });

    if (response.ok) {
      const data = await response.blob();
      const file = new File([data], filename, { type: data.type });

      return file;
    } else {
      const errorMessage = await response.text();

      throw new Error(errorMessage);
    }
  } catch (e: unknown) {
    throw e;
  }
}
