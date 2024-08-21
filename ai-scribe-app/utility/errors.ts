/** Details of an error encountered during use of the application. */
export type ApplicationError = {
  name: string;
  message: string;
  shouldRetry?: boolean;
};

/** Details of a validation issue from a web service request. */
export type WebServiceValidationErrorDetails = {
  type: string;
  loc: [string, string | number];
  msg: string;
  input?: any;
};

/** General form of an error response from the web service. */
export type WebServiceError = {
  detail: any;
};

/** Application error returned by the web service. */
export type WebServiceApplicationError = {
  detail: ApplicationError;
};

/** Validation error returned by the web service. */
export type WebServiceValidationError = {
  detail: WebServiceValidationErrorDetails;
};

/** Determines whether the entity is a WebServiceError. */
export function isWebServiceError(entity: any): entity is WebServiceError {
  return "detail" in entity;
}

/** Determines whether the entity is a WebServiceValidationError. */
export function isWebServiceValidationError(
  entity: any,
): entity is WebServiceValidationError {
  return (
    isWebServiceError(entity) &&
    "type" in entity.detail &&
    "loc" in entity.detail &&
    "msg" in entity.detail
  );
}

/** Determines whether the entity is a WebServiceAPIError. */
export function isWebServiceAPIError(
  entity: any,
): entity is WebServiceApplicationError {
  return (
    isWebServiceError(entity) &&
    "name" in entity.detail &&
    "message" in entity.detail
  );
}

export const UnexpectedError = (errorMessage: string): ApplicationError => ({
  name: "Unexpected Error",
  message: errorMessage,
  shouldRetry: true,
});

export const ConfigurationError = (errorMessage: string): ApplicationError => ({
  name: "Configuration Error",
  message: errorMessage,
  shouldRetry: false,
});

export const BadRequest = (errorMessage: string): ApplicationError => ({
  name: "Bad Request",
  message: errorMessage,
  shouldRetry: false,
});

export const BadResponse = (errorMessage: string): ApplicationError => ({
  name: "Bad Response",
  message: errorMessage,
  shouldRetry: true,
});

export const ServerError = (errorMessage: string): ApplicationError => ({
  name: "Server Error",
  message: errorMessage,
  shouldRetry: false,
});

export const ValidationError = (
  error: WebServiceValidationErrorDetails,
): ApplicationError => ({
  name: "Validation Error",
  message: JSON.stringify(error),
  shouldRetry: false,
});

export const ServerUnresponsiveError: ApplicationError = {
  name: "Server Unavailable",
  message: "The server is currently not responding.",
  shouldRetry: true,
};

export const TimeoutError: ApplicationError = {
  name: "Server Timed Out",
  message: "The request timed out.",
  shouldRetry: true,
};

export const RequestAborted: ApplicationError = {
  name: "Request Aborted",
  message: "The request was aborted.",
  shouldRetry: false,
};
