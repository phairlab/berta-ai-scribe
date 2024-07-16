import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const id: string | null = request.nextUrl.searchParams.get("id");

  return fetch(`${process.env.APP_API_URL}/audio-samples?id=${id}`);
}
