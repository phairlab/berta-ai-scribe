import pino, { Logger, LoggerOptions } from "pino";

import { postClientLog } from "./logging.server";

let loggingConfig: LoggerOptions<never> = {
  level: process.env.NEXT_LOGGING_LEVEL,
  browser: {
    write: () => {},
    transmit: {
      send: (level, logEvent) =>
        postClientLog("browser", level, logEvent.bindings, logEvent.messages),
    },
  },
  mixin: (_context, _level, logger) =>
    "runtime" in logger.bindings() ? {} : { runtime: process.env.NEXT_RUNTIME },
};

if (process.env.NODE_ENV === "development") {
  loggingConfig = {
    ...loggingConfig,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  };
}

export const config = loggingConfig;
export const logger: Logger = pino(loggingConfig);
