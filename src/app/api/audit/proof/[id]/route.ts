import { type NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/session';
import { TALOS_AUDIT_URL, AUTH_ADMIN_SECRET } from '@/lib/config';
import { signAdminJwt } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = id;
  
  // Auth Check
  const isDevMode = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  let sessionData;
  
  if (!isDevMode) {
    sessionData = await validateRequest();
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    sessionData = { user: { id: 'dev-user', role: 'admin' } };
  }

  const principalId = sessionData?.user?.id || 'anonymous';
  const token = signAdminJwt({
    sub: principalId,
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 300
  }, AUTH_ADMIN_SECRET);

  try {
    const upstreamUrl = `${TALOS_AUDIT_URL}/proof/${eventId}`;
    const response = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Talos-Principal-Id': principalId,
        'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch proof from audit service' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/audit/proof] Proxy failed:", error);
    return NextResponse.json(
      { message: "Failed to connect to audit service" },
      { status: 502 },
    );
  }
}
