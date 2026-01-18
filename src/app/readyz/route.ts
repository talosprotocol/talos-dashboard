import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Verify env vars loaded
    const config = {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
      version: process.env.VERSION
    };
    return NextResponse.json({ status: 'ready', config });
  } catch (error) {
    return NextResponse.json({ status: 'not ready' }, { status: 503 });
  }
}
