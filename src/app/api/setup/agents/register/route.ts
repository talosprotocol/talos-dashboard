
import { NextResponse } from 'next/server';
import { verifySetupGates, SecurityGateError } from '@/lib/setup-gate';
import { db } from '@/db';
import { setupAgents, pairingTokens } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    verifySetupGates();
    
    // Validate request schema (AgentRegisterRequest)
    const body = await req.json();
    const { pairing_token, hostname, version } = body;
    
    if (!pairing_token || !hostname) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Token
    const [validToken] = await db.select().from(pairingTokens)
        .where(and(
            eq(pairingTokens.token, pairing_token),
            eq(pairingTokens.consumed, false),
            gt(pairingTokens.expiresAt, new Date())
        ))
        .limit(1);

    if (!validToken) {
        return NextResponse.json({ error: 'Invalid or expired pairing token' }, { status: 403 });
    }

    // Mark Token Consumed
    await db.update(pairingTokens)
        .set({ consumed: true })
        .where(eq(pairingTokens.id, validToken.id));

    // Generate permanent Agent Secret

    // Generate permanent Agent Secret
    const agentSecret = "sk_agent_" + crypto.randomUUID();
    const secretHash = crypto.createHash('sha256').update(agentSecret).digest('hex');

    // Create Agent in DB
    const [agent] = await db.insert(setupAgents).values({
        hostname,
        version,
        secretHash, // Store hash only
        paired: true
    }).returning();

    return NextResponse.json({
        agent_id: agent.id,
        agent_secret: agentSecret, // Return secret ONCE
        workspace_root: "/var/talos/workspace" // TODO: Configurable
    });

  } catch (e) {
    if (e instanceof SecurityGateError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
