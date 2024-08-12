import suuid from "short-uuid";

import { BadRequest, CORRELATION_ID_HEADER } from "@/utility/network";
import { webServiceFetch } from "@/utility/network.server";
import { logger } from "@/utility/logging";

const log = logger.child({ module: "route-handlers/transcripts" });

export async function POST(request: Request) {
  const correlationId: string =
    request.headers.get(CORRELATION_ID_HEADER) ?? suuid.generate();

  let requestData: FormData;

  // Attempt to read request body.
  try {
    requestData = await request.formData();
  } catch {
    const errorMessage =
      "The request data was not provided in the correct format.";

    log.error({ correlationId: correlationId }, errorMessage);

    return Response.json(BadRequest(errorMessage), { status: 400 });
  }

  // Request transcript generation via the backend service.
  return webServiceFetch("/api/ai-operations/transcribe-audio", correlationId, {
    method: "POST",
    body: requestData,
  });
}
