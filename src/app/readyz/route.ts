import { NextResponse } from 'next/server';
import { getReadinessReport } from '@/lib/health';

export const runtime = 'nodejs';

export async function GET() {
  const report = await getReadinessReport();
  return NextResponse.json(report, { status: report.status === 'ready' ? 200 : 503 });
}
