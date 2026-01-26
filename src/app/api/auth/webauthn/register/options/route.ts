
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { db } from '@/db';
import { users, authenticators, webauthnChallenges } from '@/db/schema';
import { count, eq } from 'drizzle-orm';
import { validateRequest } from '@/lib/auth/session';
import { headers } from 'next/headers';
import { bytesToB64url } from '@/lib/auth/utils';

const RP_NAME = 'Talos Dashboard';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const APP_ORIGIN = process.env.APP_ORIGIN!; // Enforced in env

export async function POST(request: Request) {
    if (!APP_ORIGIN) throw new Error('APP_ORIGIN not set');

    // 1. Strict Origin Check
    const origin = (await headers()).get('origin');
    if (origin !== APP_ORIGIN) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    // 2. Determine User (Bootstrap vs Authenticated)
    const userCountRes = await db.select({ count: count() }).from(users);
    const userCount = userCountRes[0].count;
    let userId: string | undefined;
    let userEmail: string | undefined;

    if (userCount === 0) {
        // Bootstrap Mode
        const bootstrapToken = (await headers()).get('X-Talos-Bootstrap-Token');
        if (bootstrapToken !== process.env.TALOS_BOOTSTRAP_TOKEN) {
             return NextResponse.json({ error: 'Invalid bootstrap token' }, { status: 403 });
        }
        
        // Create Admin User immediately
        const newUser = await db.insert(users).values({
            email: 'admin@talos.security',
            role: 'admin',
        }).returning();
        
        userId = newUser[0].id;
        userEmail = newUser[0].email!;
    } else {
        // Authenticated Mode
        if (userCount === 1) {
            const authCountRes = await db.select({ count: count() }).from(authenticators);
            if (authCountRes[0].count === 0) {
                // Retry Bootstrap Phase
                const bootstrapToken = (await headers()).get('X-Talos-Bootstrap-Token');
                if (bootstrapToken === process.env.TALOS_BOOTSTRAP_TOKEN) {
                     const adminUser = await db.select().from(users).limit(1);
                     userId = adminUser[0].id;
                     userEmail = adminUser[0].email!;
                }
            }
        }

        if (!userId) {
             const session = await validateRequest();
             if (!session) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
             }
             userId = session.user.id;
             userEmail = session.user.email || 'user';
        }
    }

    // 3. Get existing credentials
    let excludeCredentials: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[] = [];
    if (userId) {
        const auths = await db.select().from(authenticators).where(eq(authenticators.userId, userId));
        excludeCredentials = auths.map(auth => ({
            id: auth.credentialID, // already base64url
            type: 'public-key',
        }));
    }

    // 4. Generate Options
    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: new Uint8Array(Buffer.from(userId)), 
        userName: userEmail || 'admin',
        excludeCredentials,
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'required',
            authenticatorAttachment: 'platform',
        },
    });

    // 5. Store Challenge
    await db.insert(webauthnChallenges).values({
        challenge: options.challenge,
        purpose: 'registration',
        userId: userId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), 
    });

    return NextResponse.json(options);
}
