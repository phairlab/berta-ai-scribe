import { apiFetch } from "@/utility/network";

export async function POST(request: Request) {
  const requestData = await request.formData();
  const transcript = requestData.get("transcript");
  const summaryType = requestData.get("summaryType");

  return apiFetch("summaries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: transcript,
      summaryType: summaryType,
    }),
  });
}
