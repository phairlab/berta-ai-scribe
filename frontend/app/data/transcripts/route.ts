import suuid from "short-uuid";

import { apiFetch, CORRELATION_ID_HEADER } from "@/utility/network";

export async function POST(request: Request) {
  const correlationId: string =
    request.headers.get(CORRELATION_ID_HEADER) ?? suuid.generate();

  const requestData = await request.formData();

  return apiFetch("/transcripts", correlationId, {
    method: "POST",
    body: requestData,
  });
}
