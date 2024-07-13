import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const data = await request.json();
  const audioUrl: string = data.audioUrl;
  // const audioUrl: string | null = request.nextUrl.searchParams.get("audioUrl");

  if (!audioUrl) {
    return Response.json({
      message: "No audio URL was provided.",
      status: 400,
    });
  }

  const audio = await fetch(`http://localhost:3000/${audioUrl}`);
  const audioData = await audio.blob();

  const formData = new FormData();

  formData.append("recording", audioData, "audio.mp3");

  const response = await fetch(
    `${process.env.APP_API_URL}/transcripts/create`,
    {
      method: "POST",
      body: formData,
    },
  );

  return response;
}
