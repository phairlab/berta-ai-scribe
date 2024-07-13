import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const id: string | null = request.nextUrl.searchParams.get("id");
  const type: string = request.nextUrl.searchParams.get("type") || "user";

  return fetch(
    `${process.env.APP_API_URL}/audio${type === "sample" ? "-samples" : ""}?id=${id}`,
  );
}
