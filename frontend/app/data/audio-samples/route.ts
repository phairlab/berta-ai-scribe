import fs from "fs";

export async function GET() {
  const files = await fs.promises.readdir("./public/sample-audio");
  const data = files.map((file) => ({
    name: file,
    path: `/sample-audio/${file}`,
  }));

  return Response.json(data);
}
