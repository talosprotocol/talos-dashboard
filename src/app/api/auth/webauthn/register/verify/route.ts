
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { db } from '@/db';
import { users, authenticators } from '@/db/schema';
import { verifyAndConsumeChallenge } from '@/lib/auth/challenges';
import { createSession, validateRequest } from '@/lib/auth/session';
import { headers } from 'next/headers';
import { count } from 'drizzle-orm';
import { bytesToB64url } from '@/lib/auth/utils';

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
    
    // 2. Validate Bootstrap/Auth again
    let userId: string | undefined;
    let isBootstrap = false;

    const session = await validateRequest();
    if (session) {
        userId = session.user.id;
    } else {
        // Fallback: Check if we are completing bootstrap
        const userCountRes = await db.select({ count: count() }).from(users);
        const userCount = userCountRes[0].count;

        if (userCount === 1) {
             const authCountRes = await db.select({ count: count() }).from(authenticators);
             if (authCountRes[0].count === 0) {
                 // Verify Token
                 const bootstrapToken = (await headers()).get('X-Talos-Bootstrap-Token');
                 if (bootstrapToken === process.env.TALOS_BOOTSTRAP_TOKEN) {
                     isBootstrap = true;
                     const adminUser = await db.select().from(users).limit(1);
                     userId = adminUser[0].id;
                 }
             }
        }
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // 3. Consume Challenge
    let challengeStr;
    try {
        const clientData = JSON.parse(Buffer.from(body.response.clientDataJSON, 'base64').toString('utf8'));
        challengeStr = clientData.challenge;
    } catch (e) {
         return NextResponse.json({ error: 'Invalid client data' }, { status: 400 });
    }
    
    // Verify consumption
    const challengeRecord = await verifyAndConsumeChallenge(challengeStr, 'registration');
    if (!challengeRecord) {
        return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }
    
    // Verify challenge ownership
    if (challengeRecord.userId && challengeRecord.userId !== userId) {
         return NextResponse.json({ error: 'Challenge ownership mismatch' }, { status: 403 });
    }

    // 4. Verify Registration
    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: APP_ORIGIN,
            expectedRPID: RP_ID,
            requireUserVerification: true,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
         return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential, credentialDeviceType } = registrationInfo;
    const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

    // 5. Save Authenticator
    await db.insert(authenticators).values({
        userId: userId!,
        credentialID: credentialID,
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter: Number(counter),
        transports: body.response.transports || [],
        deviceType: credentialDeviceType,
    });

    // 6. Create Session
    if (isBootstrap && userId) {
        await createSession(userId);
    }
    
    return NextResponse.json({ verified: true });
}
