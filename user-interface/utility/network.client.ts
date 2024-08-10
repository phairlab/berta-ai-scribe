"use client";

import suuid from "short-uuid";

import { logger } from "./logging";
import { performFetch } from "./network";

const log = logger.child({ module: "utility/network" });

export async function clientFetch(
  path: string,
  correlationId: string,
  init?: RequestInit,
) {
  const fullPath = `/api${path}`;
  const method = init?.method ?? "GET";

  log.trace(
    { correlationId: correlationId },
    `CLIENT ${method} ${fullPath} Request`,
  );

  const start = performance.now();
  const response = await performFetch(fullPath, correlationId, init);
  const duration = Math.floor(performance.now() - start);

  log.info(
    { correlationId: correlationId },
    `CLIENT ${method} ${fullPath} ${response.status} in ${duration}ms`,
  );

  return response;
}

export async function downloadFile(path: string, filename: string) {
  const correlationId = suuid.generate();

  log.trace({ correlationId: correlationId }, `CLIENT DOWNLOAD ${path}`);

  try {
    const start = performance.now();
    const response = await fetch(path);

    if (response.ok) {
      const data = await response.blob();
      const duration = Math.floor(performance.now() - start);

      const file = new File([data], filename, { type: data.type });

      log.info(
        { correlationId: correlationId, mimeType: data?.type },
        `CLIENT DOWNLOAD ${path} ${response.status} in ${duration}ms`,
      );

      return file;
    } else {
      const duration = Math.floor(performance.now() - start);

      log.info(
        { correlationId: correlationId },
        `CLIENT DOWNLOAD ${path} ${response.status} in ${duration}ms`,
      );

      const errorMessage = await response.text();

      throw new Error(errorMessage);
    }
  } catch (e: unknown) {
    log.error(
      { correlationId: correlationId },
      `CLIENT DOWNLOAD FAILED: [${(e as Error).name}] ${(e as Error).message}`,
    );

    throw e;
  }
}
