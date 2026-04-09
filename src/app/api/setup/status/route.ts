import { NextResponse } from 'next/server';
import { verifySetupAccess, SecurityGateError } from '@/lib/setup-gate';

export async function GET() {
  try {
    await verifySetupAccess();
    // TODO: Check actual infrastructure status (Docker, etc.)
    return NextResponse.json({ 
      status: 'ok',
      docker: 'unknown',
      services: []
    });
  } catch (e) {
    if (e instanceof SecurityGateError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
