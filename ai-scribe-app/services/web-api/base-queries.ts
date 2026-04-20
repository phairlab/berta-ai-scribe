import { headerNames } from "@/config/keys";
import * as Errors from "@/utility/errors";
import { API_BASE_URL } from "./common";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function httpAction<T>(
  method: HttpMethod,
  path: string,
  parameters?: Partial<{
    accessToken: string;
    query: { [name: string]: string | undefined };
    data: FormData | Object;
    signal: AbortSignal;
    retries: number[];
  }>,
): Promise<T> {
  let retries = parameters?.retries ?? [];

  while (true) {
    try {
      return await executeHttpAction<T>(method, path, parameters);
    } catch (ex: unknown) {
      // Verify any retries remaining.
      if (retries.length === 0) {
        throw ex;
      }

      // Verify the error is not fatal.
      if (Errors.isFatal(ex)) {
        throw ex;
      }

      // Wait the prescribed delay before retrying.
      const [delay, ...remaining] = retries;

      retries = remaining;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function executeHttpAction<T>(
  method: HttpMethod,
  path: string,
  parameters?: Partial<{
    accessToken: string;
    query: { [name: string]: string | undefined };
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

    
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let fullPath = `${API_BASE_URL}${normalizedPath}`;

    if (parameters?.query) {
      const searchParameters = new URLSearchParams(
        Object.fromEntries(
          Object.entries(parameters.query).filter(
            ([_, value]) => value !== undefined,
          ) as [string, string][],
        ),
      );
      const queryString = searchParameters.toString();

      if (queryString.length > 0) {
        fullPath = `${fullPath}?${queryString}`;
      }
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

    console.log(`Making API request to: ${fullPath}`);
    const response = await fetch(fullPath, init);

    try {
      const data: T =
        response.headers.get("Content-Type") === "application/json"
          ? ((await response.json()) as T)
          : ((await response.text()) as T);

      if (response.ok) {
        return data;
      } else {
        
        if (Errors.isWebApiError(data)) {
          if (
            Array.isArray(data.detail) &&
            data.detail.every((e) => Errors.isServerValidationError(e))
          ) {
            
            throw Errors.ValidationError(data.detail);
          } else if (Errors.isServerValidationError(data.detail)) {
            
            throw Errors.ValidationError([data.detail]);
          } else if (Errors.isApplicationError(data.detail)) {
            
            throw data.detail;
          } else {
            
            const errorMessage =
              typeof data.detail === "string"
                ? data.detail
                : JSON.stringify(data.detail);

            if (
              response.status >= 400 &&
              response.status < 500 &&
              response.status !== 405 &&
              response.status !== 429
            ) {
              
              throw Errors.RequestRejected(errorMessage);
            } else {
              
              throw Errors.ServerError(errorMessage);
            }
          }
        } else {
          
          throw Errors.ServerError(
            typeof data === "string" ? data : JSON.stringify(data),
          );
        }
      }
    } catch (ex: unknown) {
      if (Errors.isApplicationError(ex)) {
        throw ex;
      }

      throw Errors.ServerError(
        ex instanceof Error ? ex.message : "Unknown error",
      );
    }
  } catch (ex: unknown) {
    if (Errors.isApplicationError(ex)) {
      throw ex;
    }

    throw Errors.ServerError(
      ex instanceof Error ? ex.message : "Unknown error",
    );
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
