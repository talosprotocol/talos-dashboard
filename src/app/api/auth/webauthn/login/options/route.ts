
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { db } from '@/db';
import { users, authenticators, webauthnChallenges } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const APP_ORIGIN = process.env.APP_ORIGIN!;

export async function POST(request: Request) {
    if (!APP_ORIGIN) throw new Error('APP_ORIGIN not set');

    // 1. Strict Origin Check
    const origin = (await headers()).get('origin');
    if (origin !== APP_ORIGIN) {
        // Return 403 on origin mismatch
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    let allowCredentials: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[] = [];

    if (email) {
        // Email-based flow
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (user.length > 0) {
            const auths = await db.select().from(authenticators).where(eq(authenticators.userId, user[0].id));
            allowCredentials = auths.map(auth => ({
                id: auth.credentialID,
                type: 'public-key',
                // transports: ... optional
            }));
        } 
        // If user not found, we continue with empty allowCredentials (acting like discoverable or no credentials)
        // This prevents enumeration by timing or error.
    }

    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: 'required',
    });

    // Store challenge
    await db.insert(webauthnChallenges).values({
        challenge: options.challenge,
        purpose: 'authentication',
        userId: null, 
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), 
    });

    return NextResponse.json(options);
}
