import path from "path";
import fs from "fs";

import { NextRequest } from "next/server";
import { notFound } from "next/navigation";

export async function GET(request: NextRequest) {
  const id: string | null = request.nextUrl.searchParams.get("id");

  if (!id) {
    return new Response("Please provide an id.", {
      status: 400,
    });
  }

  const sampleRegex = /^(sample\:)/;
  const isSampleFile = sampleRegex.test(id);

  if (isSampleFile) {
    const sampleId = id.replace(sampleRegex, "");
    const filepath = path.join(".audio-samples", `${sampleId}.mp3`);

    if (!fs.existsSync(filepath)) {
      return notFound();
    }

    const filestats = await fs.promises.stat(filepath);

    return new Response(await fs.promises.readFile(filepath), {
      status: 200,
      headers: new Headers({
        "content-disposition": `inline; filename=${path.basename(filepath)}`,
        "content-type": "audio/mpeg",
        "content-length": `${filestats.size}`,
      }),
    });
  } else {
    return notFound(); // Placeholder.
  }
}
