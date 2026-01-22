import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Check actual infrastructure status (Docker, etc.)
  return NextResponse.json({ 
    status: 'ok',
    docker: 'unknown',
    services: []
  });
}
