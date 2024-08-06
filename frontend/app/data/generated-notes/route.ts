import suuid from "short-uuid";

import { apiFetch, CORRELATION_ID_HEADER } from "@/utility/network";

export async function POST(request: Request) {
  const correlationId: string =
    request.headers.get(CORRELATION_ID_HEADER) ?? suuid.generate();

  const requestData = await request.formData();
  const transcript = requestData.get("transcript");
  const summaryType = requestData.get("summaryType");

  return apiFetch("/summaries", correlationId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: transcript,
      summaryType: summaryType,
    }),
  });
}
