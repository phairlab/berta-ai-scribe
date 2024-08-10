"use server";

import { logger } from "./logging";
import { EnvironmentError, performFetch } from "./network";

const log = logger.child({ module: "utility/network" });

export async function webServiceFetch(
  path: string,
  correlationId: string,
  init?: RequestInit,
) {
  const apiUrlBase = process.env.APP_API_URL;
  const fullPath = `${apiUrlBase}${path}`;

  if (!apiUrlBase) {
    const errorMessage =
      "Either the environment was not set correctly, or an API fetch was attempted from a client component.";

    log.error(errorMessage);

    return Response.json(EnvironmentError(errorMessage), { status: 400 });
  }

  const method = init?.method ?? "GET";

  log.trace(
    { correlationId: correlationId },
    `API ${method} ${fullPath} Request`,
  );

  const start = performance.now();
  const response = await performFetch(fullPath, correlationId, init);
  const duration = Math.floor(performance.now() - start);

  log.info(
    { correlationId: correlationId },
    `API ${method} ${fullPath} ${response.status} in ${duration}ms`,
  );

  return response;
}
