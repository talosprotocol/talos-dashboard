/**
 * Talos Dashboard - Telemetry Stats Proxy
 *
 * @route GET /api/admin/telemetry/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GATEWAY_URL = process.env.TALOS_GATEWAY_URL ?? 'http://talos-gateway:8000';

export async function GET(req: NextRequest): Promise<Response> {
  const isDevMode = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  
  if (!isDevMode) {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const window_hours = searchParams.get('window_hours') || '24';

  try {
    const upstream = await fetch(
      `${GATEWAY_URL}/admin/v1/telemetry/stats?window_hours=${window_hours}`,
      { method: 'GET', signal: req.signal }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { code: 'TALOS_ADMIN_FETCH_FAILED', message: 'Failed to fetch telemetry stats' },
        { status: upstream.status }
      );
    }

    return NextResponse.json(await upstream.json());
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }
    return NextResponse.json(
      { code: 'TALOS_ADMIN_CONNECTION_FAILED', message: 'Failed to connect to gateway' },
      { status: 502 }
    );
  }
}
