import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    const headers = new Headers(request.headers);

    if (process.env.NODE_ENV === "development") {
      headers.set(
        "sf-context-current-user",
        process.env.DEV_USER ?? "DEV_USER",
      );
    }

    const destination = new URL(
      process.env.WEB_SERVICE_URL ?? "http://web-service:8000",
    );

    const url = request.nextUrl.clone();

    url.protocol = destination.protocol;
    url.host = destination.host;
    url.port = destination.port;

    return NextResponse.rewrite(url, { headers: headers });
  }
}

export const config = {
  matcher: "/api/:path*",
};
