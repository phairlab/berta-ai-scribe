export class InvalidOperationError extends Error {
  constructor(failedCondition: string) {
    super(`Invalid Operation: ${failedCondition}`);
    Object.setPrototypeOf(this, InvalidOperationError.prototype);
  }
}

/** Details of an error encountered during use of the application. */
export type ApplicationError = {
  name: string;
  message: string;
  retry?: boolean;
};

/** Details of a validation issue from a web service request. */
export type ServerValidationError = {
  type: string;
  loc: [string, string | number];
  msg: string;
  input?: any;
};

/** General form of an error response from the web service. */
export type WebApiError<T> = {
  detail: T;
};

/** Determines whether the entity is a WebServiceError. */
export function isWebApiError(entity: any): entity is WebApiError<any> {
  return (
    typeof entity === "object" &&
    entity !== null &&
    (entity as WebApiError<any>).detail !== undefined
  );
}

/** Determines whether the entity is a WebServiceValidationError. */
export function isServerValidationError(
  entity: any,
): entity is ServerValidationError {
  return (
    (entity as ServerValidationError).type !== undefined &&
    (entity as ServerValidationError).loc !== undefined &&
    (entity as ServerValidationError).msg !== undefined
  );
}

/** Determines whether the entity is a WebServiceAPIError. */
export function isApplicationError(entity: any): entity is ApplicationError {
  return (
    (entity as ApplicationError).name !== undefined &&
    (entity as ApplicationError).message !== undefined
  );
}

/** Returns the error directly if it is an ApplicationError,
 * otherwise creates and returns an UnexpectedError from the provided error. */
export function asApplicationError(error: unknown): ApplicationError {
  if (isApplicationError(error)) {
    return error;
  } else if (typeof error === "string") {
    return UnexpectedError(error);
  } else {
    return UnexpectedError((error as Error).message);
  }
}

export const UnexpectedError = (errorMessage: string): ApplicationError => ({
  name: "Unexpected Error",
  message: errorMessage,
  retry: true,
});

export const ConfigurationError = (errorMessage: string): ApplicationError => ({
  name: "Configuration Error",
  message: errorMessage,
  retry: false,
});

export const BadRequest = (errorMessage: string): ApplicationError => ({
  name: "Bad Request",
  message: errorMessage,
  retry: false,
});

export const BadResponse = (errorMessage: string): ApplicationError => ({
  name: "Bad Response",
  message: errorMessage,
  retry: true,
});

export const ServerError = (errorMessage: string): ApplicationError => ({
  name: "Server Error",
  message: errorMessage,
  retry: false,
});

export const ValidationError = (
  errors: ServerValidationError[],
): ApplicationError => ({
  name: "Validation Error",
  message: JSON.stringify(errors),
  retry: false,
});

export const ServerUnresponsiveError: ApplicationError = {
  name: "Server Unavailable",
  message: "The server is currently not responding.",
  retry: true,
};

export const TimeoutError: ApplicationError = {
  name: "Server Timed Out",
  message: "The request timed out.",
  retry: true,
};

export const RequestAborted: ApplicationError = {
  name: "Request Aborted",
  message: "The request was aborted.",
  retry: false,
};
