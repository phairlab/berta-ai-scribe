import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api") || request.nextUrl.pathname.startsWith("/auth")) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
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
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/auth/:path*"],
};
