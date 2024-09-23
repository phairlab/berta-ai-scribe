import { jwtDecode } from "jwt-decode";

import { AppContextData, UserSession, WebApiToken } from "@/models";

import * as Errors from "./errors";

export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function authenticate(
  user: string | null,
  userAgent: string | null = null,
): Promise<{
  accessToken: string;
  session: UserSession;
}> {
  if (!user) {
    throw Error("Authentication failed: user not identified");
  }

  let headers: HeadersInit = {};

  if (userAgent) {
    headers = { ...headers, "jenkins-user-agent": userAgent };
  }

  const response = await fetch(`${process.env.WEB_API_SERVER}/authenticate`, {
    headers: { ...headers, "sf-context-current-user": user },
    cache: "no-store",
  });

  if (!response.ok) {
    throw Error("Authentication failed");
  }

  const { accessToken } = (await response.json()) as WebApiToken;
  const session = jwtDecode<UserSession>(accessToken);

  return { accessToken, session };
}

export async function fetchAppContextData(
  accessToken: string,
): Promise<AppContextData> {
  const urls = [
    `${process.env.WEB_API_SERVER}/encounters`,
    `${process.env.WEB_API_SERVER}/note-definitions`,
    `${process.env.WEB_API_SERVER}/sample-recordings`,
  ];

  const responses = await Promise.all(
    urls.map((url) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    ),
  );

  if (responses.filter((response) => !response.ok).length > 0) {
    throw Error("Something went wrong while initializing the data");
  }

  const [encounters, noteDefinitions, sampleRecordings] = await Promise.all(
    responses.map((response) => response.json()),
  );

  return { encounters, noteDefinitions, sampleRecordings };
}

type WebApiActionParameters = Partial<{
  accessToken: string;
  data: FormData | Object;
  abortSignal: AbortSignal;
}>;

export async function webApiAction<T>(
  method: RequestMethod,
  path: string,
  parameters?: WebApiActionParameters,
): Promise<T> {
  try {
    let requestHeaders: HeadersInit | undefined;

    if (parameters?.accessToken) {
      requestHeaders = {
        ...requestHeaders,
        "Jenkins-Authorization": `Bearer ${parameters.accessToken}`,
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
      signal: parameters?.abortSignal,
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
  accessToken: string,
  abortSignal?: AbortSignal,
) {
  try {
    const response = await fetch(path, {
      headers: {
        "Jenkins-Authorization": `Bearer ${accessToken}`,
      },
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
