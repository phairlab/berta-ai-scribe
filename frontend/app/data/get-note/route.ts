import path from "path";
import fs from "fs";

import { NextRequest } from "next/server";
import { notFound } from "next/navigation";

export async function GET(request: NextRequest) {
  const API_URL = process.env.APP_API_URL;

  const noteTypes = [
    "Dx and DDx",
    "Feedback",
    "Full Visit",
    "Hallway Consult",
    "Handover Note",
    "Impression Note",
    "Medications",
    "Psych",
  ];

  const id: string | null = request.nextUrl.searchParams.get("id");
  const noteType: string | null = request.nextUrl.searchParams.get("noteType");

  if (!id) {
    return new Response("Please provide an id.", {
      status: 400,
    });
  }

  if (!noteType) {
    return new Response("Please provide a note type.", {
      status: 400,
    });
  }

  if (!noteTypes.includes(noteType)) {
    return new Response("Invalid note type.", {
      status: 400,
    });
  }

  const sampleRegex = /^(sample\:)/;
  const isSampleFile = sampleRegex.test(id);

  if (isSampleFile) {
    const sampleId = id.replace(sampleRegex, "");
    const filename = `${sampleId}.mp3`;
    const filepath = path.join(".audio-samples", filename);

    if (!fs.existsSync(filepath)) {
      return notFound();
    }

    const formData = new FormData();

    const fileBlob = await fs.openAsBlob(filepath, { type: "audio/mpeg" });

    formData.append("recording", fileBlob, filename);

    const response = await fetch(`${API_URL}/audio/generate_note`, {
      method: "POST",
      body: formData,
    });

    return response;
  } else {
    return notFound(); // Placeholder.
  }
}
