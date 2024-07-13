import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const data = await request.json();
  const transcript = data.transcript;
  const summaryType = data.summaryType;

  const response = await fetch(`${process.env.APP_API_URL}/summaries/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: transcript,
      summaryType: summaryType,
    }),
  });

  return response;
}
