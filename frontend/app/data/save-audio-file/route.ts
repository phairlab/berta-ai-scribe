import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  return fetch(`${process.env.APP_API_URL}/audio/create`, {
    method: "POST",
    body: formData,
  });
}
