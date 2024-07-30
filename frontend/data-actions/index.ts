"use server";

import * as Data from "@/data-models";
import * as Errors from "@/errors";

const REQUEST_TIMEOUT = 40_000;

export const transcribeAudio = async (
  formData: FormData,
): Promise<Data.Transcript> => {
  // Start fetch.
  const action = fetch(`${process.env.APP_API_URL}/transcripts/create`, {
    method: "POST",
    body: formData,
  });

  // Start timeout.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Errors.ServerTimeout()), REQUEST_TIMEOUT),
  );

  let response: Response;

  try {
    response = (await Promise.race([action, timeout])) as Response;
  } catch (e: unknown) {
    if (e instanceof Errors.ServerTimeout) {
      // Response timeout.
      throw e;
    } else {
      // Network error.
      throw new Errors.NetworkInterrupted((e as Error).message);
    }
  }

  // Handle HTTP response errors.
  if (!response.ok) {
    const errorDetails = await response.text();

    switch (response.status) {
      case 415:
        // Unsupported Media Type
        throw new Errors.UnprocessableAudio(errorDetails);
      case 422:
        // Validation Error
        throw new Errors.InvalidRequest(errorDetails);
      case 500:
        // Internal Server Error
        throw new Errors.ServerError(errorDetails);
      case 502:
        // Bad Gateway
        throw new Errors.AIServiceError(errorDetails);
      case 503:
        // Service Unavailable
        throw new Errors.TransientAIServiceError(errorDetails);
      case 504:
        // Gateway Timeout
        throw new Errors.AIServiceTimeout(errorDetails);
      default:
        throw new Errors.UnknownError(errorDetails);
    }
  }

  // Return the response.
  // Check the content, which can be disrupted by a network interruption while streaming the response.
  try {
    return response.json();
  } catch (e: unknown) {
    // Network interrupted
    throw new Errors.NetworkInterrupted();
  }
};

export const generateNote = async (
  transcript: string,
  summaryType: string,
): Promise<Data.GeneratedNote> => {
  // Start fetch.
  const action = await fetch(`${process.env.APP_API_URL}/summaries/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: transcript,
      summaryType: summaryType,
    }),
  });

  // Start timeout.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Errors.ServerTimeout()), REQUEST_TIMEOUT),
  );

  let response: Response;

  try {
    response = (await Promise.race([action, timeout])) as Response;
  } catch (e: unknown) {
    if (e instanceof Errors.ServerTimeout) {
      // Response timeout.
      throw e;
    } else {
      // Network error.
      throw new Errors.NetworkInterrupted((e as Error).message);
    }
  }

  // Handle HTTP response errors.
  if (!response.ok) {
    const errorDetails = await response.text();

    switch (response.status) {
      case 422:
        // Validation Error
        throw new Errors.InvalidRequest(errorDetails);
      case 500:
        // Internal Server Error
        throw new Errors.ServerError(errorDetails);
      case 502:
        // Bad Gateway
        throw new Errors.AIServiceError(errorDetails);
      case 503:
        // Service Unavailable
        throw new Errors.TransientAIServiceError(errorDetails);
      case 504:
        // Gateway Timeout
        throw new Errors.AIServiceTimeout(errorDetails);
      default:
        throw new Errors.UnknownError(errorDetails);
    }
  }

  // Return the response.
  // Check the content, which can be disrupted by a network interruption while streaming the response.
  try {
    return response.json();
  } catch (e: unknown) {
    // Network interrupted
    throw new Errors.NetworkInterrupted();
  }
};
