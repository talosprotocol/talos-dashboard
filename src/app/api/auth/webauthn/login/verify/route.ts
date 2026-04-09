
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db } from '@/db';
import { users, authenticators } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAndConsumeChallenge } from '@/lib/auth/challenges';
import { createSession } from '@/lib/auth/session';
import { headers } from 'next/headers';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const APP_ORIGIN = process.env.APP_ORIGIN!;

export async function POST(request: Request) {
    if (!APP_ORIGIN) throw new Error('APP_ORIGIN not set');

    // 1. Strict Origin Check
    const origin = (await headers()).get('origin');
    if (origin !== APP_ORIGIN) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const body = await request.json();
    const { response } = body; 
    
    // Extract challenge to lookup
    // clientDataJSON is base64url encoded
    let challengeStr;
    try {
        const clientData = JSON.parse(Buffer.from(response.clientDataJSON, 'base64').toString('utf8'));
        challengeStr = clientData.challenge;
    } catch {
        return NextResponse.json({ error: 'Invalid client data' }, { status: 400 });
    }

    // 2. Consume Challenge
    const challengeRecord = await verifyAndConsumeChallenge(challengeStr, 'authentication');
    if (!challengeRecord) {
        return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    // 3. Lookup Authenticator
    const credentialID = response.id; 
    
    const authRecord = await db.select().from(authenticators).where(eq(authenticators.credentialID, credentialID)).limit(1);

    if (authRecord.length === 0) {
        return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });
    }
    const authenticator = authRecord[0];

    // 4. Verify Response
    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: APP_ORIGIN,
            expectedRPID: RP_ID,
            credential: {
                id: authenticator.credentialID,
                publicKey: new Uint8Array(authenticator.credentialPublicKey),
                counter: Number(authenticator.counter),
                transports: authenticator.transports as AuthenticatorTransport[],
            },
            requireUserVerification: true,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { verified, authenticationInfo } = verification;
    
    if (!verified) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // 5. Update Authenticator Counter
    await db.update(authenticators).set({
        counter: Number(authenticationInfo.newCounter),
        lastUsedAt: new Date(),
    }).where(eq(authenticators.id, authenticator.id));
    
    // Update User Last Login
    await db.update(users).set({
        lastLoginAt: new Date()
    }).where(eq(users.id, authenticator.userId));

    // 6. Create Session
    await createSession(authenticator.userId);

    return NextResponse.json({ verified: true });
}
