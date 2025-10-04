import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('berta_session');

    if (!sessionCookie) {
      return new NextResponse(
        JSON.stringify({ error: 'No session cookie found' }),
        { status: 401 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/auth/check-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `berta_session=${sessionCookie.value}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({ error: 'Session validation failed' }),
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
} 