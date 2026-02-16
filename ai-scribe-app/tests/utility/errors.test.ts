import { describe, it, expect } from "vitest";
import {
  isWebApiError,
  isServerValidationError,
  isApplicationError,
  isFatal,
  isAbortError,
  asApplicationError,
  UnexpectedError,
  ConfigurationError,
  BadRequest,
  BadResponse,
  RequestRejected,
  ServerError,
  ValidationError,
  ServerUnresponsiveError,
  TimeoutError,
  RequestAborted,
  InvalidOperationError,
} from "@/utility/errors";

describe("isWebApiError", () => {
  it("returns true for an object with a detail property", () => {
    expect(isWebApiError({ detail: "something" })).toBe(true);
  });

  it("returns false for an object without a detail property", () => {
    expect(isWebApiError({ other: "thing" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isWebApiError(null)).toBe(false);
  });
});

describe("isApplicationError", () => {
  it("returns true for an object with name and message", () => {
    expect(isApplicationError({ name: "err", message: "msg" })).toBe(true);
  });

  it("returns false for an object missing message", () => {
    expect(isApplicationError({ name: "err" })).toBe(false);
  });
});

describe("isServerValidationError", () => {
  it("returns true for a valid server validation error", () => {
    expect(
      isServerValidationError({ type: "t", loc: ["body", "field"], msg: "m" }),
    ).toBe(true);
  });
});

describe("isFatal", () => {
  it("returns true when fatal is true", () => {
    expect(isFatal({ name: "x", message: "y", fatal: true })).toBe(true);
  });

  it("returns false when fatal is false", () => {
    expect(isFatal({ name: "x", message: "y", fatal: false })).toBe(false);
  });

  it("returns false when fatal is not present", () => {
    expect(isFatal({})).toBe(false);
  });
});

describe("isAbortError", () => {
  it("returns true for a DOMException with name AbortError", () => {
    const err = new DOMException("aborted", "AbortError");
    expect(isAbortError(err)).toBe(true);
  });

  it("returns false for a regular Error", () => {
    expect(isAbortError(new Error("fail"))).toBe(false);
  });
});

describe("asApplicationError", () => {
  it("returns the same object if it is already an ApplicationError", () => {
    const appErr = { name: "Test", message: "test message" };
    expect(asApplicationError(appErr)).toBe(appErr);
  });

  it("wraps a string in an UnexpectedError", () => {
    const result = asApplicationError("something went wrong");
    expect(result.name).toBe("Unexpected Error");
    expect(result.message).toBe("something went wrong");
  });

  it("returns an Error as-is since it has name and message", () => {
    const error = new Error("original message");
    const result = asApplicationError(error);
    expect(result.name).toBe("Error");
    expect(result.message).toBe("original message");
  });
});

describe("error factories", () => {
  it("UnexpectedError creates a non-fatal error", () => {
    const err = UnexpectedError("msg");
    expect(err).toEqual({ name: "Unexpected Error", message: "msg", fatal: false });
  });

  it("ConfigurationError creates a fatal error", () => {
    const err = ConfigurationError("msg");
    expect(err).toEqual({ name: "Configuration Error", message: "msg", fatal: true });
  });

  it("BadRequest creates a fatal error", () => {
    const err = BadRequest("msg");
    expect(err).toEqual({ name: "Bad Request", message: "msg", fatal: true });
  });

  it("BadResponse creates a non-fatal error", () => {
    const err = BadResponse("msg");
    expect(err).toEqual({ name: "Bad Response", message: "msg", fatal: false });
  });

  it("RequestRejected creates a fatal error", () => {
    const err = RequestRejected("msg");
    expect(err).toEqual({ name: "Request Rejected", message: "msg", fatal: true });
  });

  it("ServerError creates a non-fatal error", () => {
    const err = ServerError("msg");
    expect(err).toEqual({ name: "Server Error", message: "msg", fatal: false });
  });

  it("ValidationError creates a fatal error with serialized details", () => {
    const err = ValidationError([{ type: "t", loc: ["body", "f"], msg: "m" }]);
    expect(err.name).toBe("Validation Error");
    expect(err.fatal).toBe(true);
  });
});

describe("constant errors", () => {
  it("ServerUnresponsiveError is not fatal", () => {
    expect(ServerUnresponsiveError.fatal).toBe(false);
  });

  it("TimeoutError is not fatal", () => {
    expect(TimeoutError.fatal).toBe(false);
  });

  it("RequestAborted is fatal", () => {
    expect(RequestAborted.fatal).toBe(true);
  });
});

describe("InvalidOperationError", () => {
  it("produces a message containing the failed condition", () => {
    const err = new InvalidOperationError("condition");
    expect(err.message).toContain("Invalid Operation: condition");
  });

  it("is an instance of Error", () => {
    const err = new InvalidOperationError("test");
    expect(err).toBeInstanceOf(Error);
  });
});
