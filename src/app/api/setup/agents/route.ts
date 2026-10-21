import { NextResponse } from 'next/server';
import { db } from '@/db';
import { setupAgents } from '@/db/schema';
import { verifySetupAccess, SecurityGateError } from '@/lib/setup-gate';

export async function GET() {
  try {
    await verifySetupAccess();
    const agents = await db
      .select({
        id: setupAgents.id,
        hostname: setupAgents.hostname,
        version: setupAgents.version,
        paired: setupAgents.paired,
        lastSeenAt: setupAgents.lastSeenAt,
      })
      .from(setupAgents);

    return NextResponse.json({ agents });
  } catch (e) {
    if (e instanceof SecurityGateError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
