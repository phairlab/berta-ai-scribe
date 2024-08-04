"use server";

import pino from "pino";

import { logger } from "./logging";

export async function postClientLog(
  runtime: string,
  level: pino.Level,
  bindings: pino.Bindings[],
  messages: any[],
) {
  const log = logger.child({
    ...Object.assign({}, ...bindings),
    runtime: runtime,
  });

  // @ts-ignore
  log[level](...messages);
}
