import suuid from "short-uuid";

import { BadRequest, CORRELATION_ID_HEADER } from "@/utility/network";
import { webServiceFetch } from "@/utility/network.server";
import { logger } from "@/utility/logging";

const log = logger.child({ module: "route-handlers/generated-notes" });

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

  const transcript = requestData.get("transcript");

  // Handle missing transcript.
  if (!transcript) {
    const errorMessage = "Missing transcript";

    log.error({ correlationId: correlationId }, errorMessage);

    return Response.json(BadRequest(errorMessage), { status: 400 });
  }

  const summaryType = requestData.get("noteType");

  // Handle missing note type.
  if (!summaryType) {
    const errorMessage = "Missing note type";

    log.error({ correlationId: correlationId }, errorMessage);

    return Response.json(BadRequest(errorMessage), { status: 400 });
  }

  // Request note generation via the backend service.
  return webServiceFetch("/api/ai-operations/generate-note", correlationId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: transcript,
      noteType: summaryType,
    }),
  });
}
