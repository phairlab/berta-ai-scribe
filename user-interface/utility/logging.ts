import pino, { Logger, LoggerOptions } from "pino";

import { postClientLog } from "./logging.server";

let loggingConfig: LoggerOptions<never> = {
  level: "debug",
  browser: {
    write: () => {},
    transmit: {
      send: (level, logEvent) =>
        postClientLog("browser", level, logEvent.bindings, logEvent.messages),
    },
  },
  transport: {
    target: "pino-pretty",
    options: {
      colorize: process.env.NODE_ENV === "development",
      ignore: "pid,hostname",
      messageFormat:
        "[{module}] {msg}{if correlationId} [{correlationId}]{end} ({runtime})",
      hideObject: true,
    },
  },
  mixin: (_context, _level, logger) =>
    "runtime" in logger.bindings() ? {} : { runtime: process.env.NEXT_RUNTIME },
};

// export const config = loggingConfig;
export const logger: Logger = pino(loggingConfig);
