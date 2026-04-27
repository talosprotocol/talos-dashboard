
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
    if (!APP_ORIGIN) {
        return NextResponse.json({ error: 'APP_ORIGIN not set' }, { status: 500 });
    }

    // 1. Strict Origin Check
    const origin = (await headers()).get('origin');
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

    // In dev, use the actual origin hostname as RP_ID to satisfy browser security
    let effectiveRpId = RP_ID;
    if (isDev && origin) {
        try {
            effectiveRpId = new URL(origin).hostname;
        } catch {
            effectiveRpId = RP_ID;
        }
    }

    const isValidOrigin = origin === APP_ORIGIN || (isDev && (
        origin === 'http://localhost:3000' ||
        origin === 'http://127.0.0.1:3000'
    ));

    if (!isValidOrigin) {
        console.error(`[WebAuthn] Origin mismatch: received "${origin}", expected "${APP_ORIGIN}"`);
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => ({}));
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
            rpID: effectiveRpId,
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
    } catch (error) {
        console.error('[WebAuthn] Failed to create authentication options', error);
        return NextResponse.json(
            { error: 'Passkey login is unavailable. Check the dashboard database connection or use Dev Login.' },
            { status: 503 }
        );
    }
}
