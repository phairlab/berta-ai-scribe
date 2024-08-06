export async function GET() {
  return Response.json({
    loggingLevel: process.env.LOGGING_LEVEL ?? "info",
  });
}
