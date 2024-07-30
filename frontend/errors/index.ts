export class DataError extends Error {
  public isDataError = true;
  public shouldRetry: boolean;
  public details;

  constructor(
    name: string,
    message: string,
    shouldRetry: boolean = false,
    details?: string,
  ) {
    super(
      details ??
        "An error has occurred. The issue has been logged and the team will be notified.",
    );
    Object.setPrototypeOf(this, DataError.prototype);
    this.name = name;
    this.shouldRetry = shouldRetry;
    this.details = details;
  }
}

export class UnknownError extends DataError {
  constructor(details: string) {
    super(
      "Error",
      "An error has occurred. The issue has been logged and the team will be notified.",
      false,
      details,
    );
    Object.setPrototypeOf(this, UnknownError.prototype);
  }
}

export class InvalidRequest extends DataError {
  constructor(details: string) {
    super(
      "Invalid Request",
      "An error occurred with the request. The issue has been logged and the team will be notified.",
      false,
      details,
    );
    Object.setPrototypeOf(this, InvalidRequest.prototype);
  }
}

export class UnprocessableAudio extends DataError {
  constructor(details: string) {
    super(
      "Audio Cannot be Processed",
      "An error occurred while processing the audio data sent to the server. The issue has been logged and the team will be notified.",
      false,
      details,
    );
    Object.setPrototypeOf(this, UnprocessableAudio.prototype);
  }
}

export class NetworkInterrupted extends DataError {
  constructor(details?: string) {
    super(
      "Network Interrupted",
      "The request failed due to an interruption in the network.",
      true,
      details,
    );
    Object.setPrototypeOf(this, NetworkInterrupted.prototype);
  }
}

export class ServerError extends DataError {
  constructor(details: string) {
    super(
      "Server Error",
      "An error occurred on the server. The issue has been logged and the team will be notified.",
      false,
      details,
    );
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

export class ServerTimeout extends DataError {
  constructor() {
    super(
      "Network Timeout",
      "A timeout occurred while waiting for the server to respond. Please wait a moment and try again.",
      true,
      undefined,
    );
    Object.setPrototypeOf(this, ServerTimeout.prototype);
  }
}

export class AIServiceError extends DataError {
  constructor(details: string) {
    super(
      "AI Service Error",
      "An error occurred when communicating with the AI Service.  The issue has been logged and the team will be notified.",
      false,
      details,
    );
    Object.setPrototypeOf(this, AIServiceError.prototype);
  }
}

export class AIServiceTimeout extends DataError {
  constructor(details: string) {
    super(
      "AI Service Error",
      "The AI Service timed out. Please wait a moment and try again.",
      true,
      details,
    );
    Object.setPrototypeOf(this, AIServiceTimeout.prototype);
  }
}

export class TransientAIServiceError extends DataError {
  constructor(details: string) {
    super(
      "AI Service Unavailable",
      "The AI Service is temporarily unavailable. Please wait a moment and try again.",
      true,
      details,
    );
    Object.setPrototypeOf(this, TransientAIServiceError.prototype);
  }
}
