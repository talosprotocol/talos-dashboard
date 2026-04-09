import { NextResponse } from 'next/server';
import { getReadinessReport, renderPrometheusMetrics } from '@/lib/health';

export const runtime = 'nodejs';

export async function GET() {
  const report = await getReadinessReport();
  return new NextResponse(renderPrometheusMetrics(report), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
