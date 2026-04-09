import { NextResponse } from 'next/server';
import { getBuildInfo } from '@/lib/health';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    ...getBuildInfo(),
  });
}
