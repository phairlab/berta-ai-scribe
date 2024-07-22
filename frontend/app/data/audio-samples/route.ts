import fs from "fs";

import { NextResponse } from "next/server";

export async function GET() {
  const files = await fs.promises.readdir("./public/sample-audio");
  const data = files.map((file) => ({
    name: file,
    path: `/sample-audio/${file}`,
  }));

  return NextResponse.json(data);
}
