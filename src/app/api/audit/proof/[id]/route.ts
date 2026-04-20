import { type NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/session';
import { TALOS_AUDIT_URL } from '@/lib/config';
import { getBrokeredAdminToken } from '@/lib/auth/adminTokenBroker';

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
    sessionData = { user: { id: process.env.AUTH_ADMIN_PRINCIPAL || 'dev-admin', role: 'admin' } };
  }

  try {
    const principalId = sessionData?.user?.id || 'anonymous';
    const token = await getBrokeredAdminToken({
      principal: principalId,
      permissions: ["audit.read"],
      sessionId: sessionData?.session?.id,
    });

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
