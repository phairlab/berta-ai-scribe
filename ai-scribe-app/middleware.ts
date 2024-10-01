import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    // Redirect /openapi.json calls during development.
    if (request.nextUrl.pathname === "/openapi.json") {
      const url = request.nextUrl.clone();

      url.pathname = "/api/openapi.json";

      return NextResponse.redirect(url);
    }

    // Set the snowflake context user.
    const requestHeaders = new Headers(request.headers);

    if (process.env.SNOWFLAKE_CONTEXT_USER) {
      requestHeaders.set(
        "sf-context-current-user",
        process.env.SNOWFLAKE_CONTEXT_USER,
      );
    }

    // Proxy Web API requests during development.
    if (request.nextUrl.pathname.startsWith("/api")) {
      const destination = new URL("http://localhost:8000");

      const url = request.nextUrl.clone();

      url.protocol = destination.protocol;
      url.host = destination.host;
      url.port = destination.port;
      url.pathname = request.nextUrl.pathname.slice("/api".length);

      return NextResponse.rewrite(url, { headers: requestHeaders });
    }

    // For other requests in dev, only update the headers.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // In production, forward the request as normal.
  return NextResponse.next();
}
