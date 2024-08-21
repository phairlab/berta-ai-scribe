import * as Errors from "./errors";

export async function webServiceFetch(path: string, init?: RequestInit) {
  try {
    const response = await fetch(path, init);

    try {
      let data = await response.json();

      // Convert any validation errors into standard form.
      if (Errors.isWebServiceValidationError(data)) {
        data = Errors.ValidationError(data.detail);
      }

      return Response.json(data, { status: response.status });
    } catch (e: unknown) {
      return Response.json(Errors.BadResponse((e as Error).message), {
        status: 500,
      });
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return Response.json(Errors.TimeoutError, { status: 504 });
    } else if (e instanceof DOMException && e.name === "AbortError") {
      return Response.json(Errors.RequestAborted, { status: 400 });
    } else if (e instanceof TypeError) {
      return Response.json(Errors.ServerUnresponsiveError, { status: 503 });
    } else {
      return Response.json(Errors.ServerError((e as Error).message), {
        status: 500,
      });
    }
  }
}

export async function downloadFile(path: string, filename: string) {
  try {
    const response = await fetch(path);

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
