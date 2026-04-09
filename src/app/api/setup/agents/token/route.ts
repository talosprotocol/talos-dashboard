
import { NextResponse } from 'next/server';
import { verifySetupAccess, SecurityGateError } from '@/lib/setup-gate';

import { db } from '@/db';
import { pairingTokens } from '@/db/schema';
import crypto from 'crypto';

export async function POST() {
  try {
    // 1. Enforce Hard Gates and Admin Auth
    await verifySetupAccess();

    // 3. Generate Token
    const token = "talos_pairing_" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    
    await db.insert(pairingTokens).values({
        token: token,
        expiresAt: expiresAt,
        description: "Admin generated via Setup API"
    });

    return NextResponse.json({ 
      token: token,
      expires_in: 300 
    });

  } catch (e) {
    if (e instanceof SecurityGateError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
