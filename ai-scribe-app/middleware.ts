import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Handle API requests
  if (request.nextUrl.pathname.startsWith("/api") || request.nextUrl.pathname.startsWith("/auth")) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL environment variable is not set');
      return NextResponse.next();
    }

    try {
      const destination = new URL(backendUrl);
      const url = request.nextUrl.clone();
      url.protocol = destination.protocol;
      url.host = destination.host;
      url.port = destination.port;
      return NextResponse.rewrite(url);
    } catch (error) {
      console.error('Error handling API rewrite:', error);
      return NextResponse.next();
    }
  }

  // Update headers if needed
  const requestHeaders = new Headers(request.headers);
  if (process.env.SNOWFLAKE_CONTEXT_USER) {
    requestHeaders.set(
      "sf-context-current-user",
      process.env.SNOWFLAKE_CONTEXT_USER,
    );
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/api/:path*", "/auth/:path*"],
};
