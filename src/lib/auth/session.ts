import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import 'server-only';
import { b64urlToBytes, bytesToB64url, generateRandomBytes, hmac, sha256 } from './utils';
import { timingSafeEqual } from 'crypto';

const COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-talos.sid' : 'talos.sid';
// Default 7 days
const SESSION_TTL = 60 * 60 * 24 * 7; 

// Secret must be 32+ bytes, base64url encoded
const SECRET_B64 = process.env.AUTH_COOKIE_HMAC_SECRET || '';

function getSecretBytes(): Buffer {
    if (!SECRET_B64) {
        throw new Error('AUTH_COOKIE_HMAC_SECRET is not set');
    }
    return b64urlToBytes(SECRET_B64);
}

export async function createSession(userId: string) {
    const secretBytes = getSecretBytes();
    
    // 1. Generate Token (32 bytes random)
    const tokenBytes = generateRandomBytes(32);
    const tokenB64 = bytesToB64url(tokenBytes);
    
    // 2. Calculate Expiry
    const now = Math.floor(Date.now() / 1000);
    const exp = now + SESSION_TTL;
    
    // 3. Create Payload and Signature
    // Format: v1.<exp>.<token>.<sig>
    const payload = `v1.${exp}.${tokenB64}`;
    const sigBytes = hmac(secretBytes, payload);
    const sigB64 = bytesToB64url(sigBytes);
    const cookieValue = `${payload}.${sigB64}`;

    // 4. Store in DB (SHA-256 of raw token bytes)
    const tokenHash = sha256(tokenBytes);
    
    await db.insert(sessions).values({
        userId,
        tokenHash: tokenHash, // Drizzle bytea expects Buffer
        expiresAt: new Date(exp * 1000),
        lastSeenAt: new Date(),
    });

    // 5. Set Cookie
    (await cookies()).set(COOKIE_NAME, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true for __Host-
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL,
    });

    return cookieValue;
}

export async function validateRequest() {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    
    if (!cookie) return null;
    const value = cookie.value;

    const secretBytes = getSecretBytes();

    // 1. Parse Format: v1.exp.token.sig
    const parts = value.split('.');
    if (parts.length !== 4) return null;
    const [ver, expStr, tokenB64, sigB64] = parts;
    
    if (ver !== 'v1') return null;

    // 2. Verify Expiry
    const exp = parseInt(expStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (exp < now) return null;

    // 3. Verify Signature
    const payload = `v1.${expStr}.${tokenB64}`;
    const expectedSigBytes = hmac(secretBytes, payload);
    
    // Constant-time comparison
    const sigBytes = b64urlToBytes(sigB64);
    if (sigBytes.length !== expectedSigBytes.length) return null;
    if (!timingSafeEqual(sigBytes, expectedSigBytes)) return null;

    // In MOCK mode, if the signature is valid, bypass the database lookup
    const DATA_SOURCE_MODE = process.env.NEXT_PUBLIC_TALOS_DATA_MODE || process.env.DATA_SOURCE_MODE || 'HTTP';
    if (DATA_SOURCE_MODE === 'MOCK') {
        return {
            session: { id: "mock-session", userId: "dev-user", expiresAt: new Date(Date.now() + 86400000) },
            user: { id: "dev-user", email: "admin@talos.security", role: "admin" }
        };
    }

    // 4. DB Lookup
    const tokenBytes = b64urlToBytes(tokenB64);
    const tokenHash = sha256(tokenBytes);

    const result = await db.select({
        session: sessions,
        user: users
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash));
    
    if (result.length === 0) return null;
    const { session, user } = result[0];

    // 5. Check DB Expiry/Revocation
    if (session.expiresAt.getTime() < Date.now()) return null;
    if (session.revokedAt) return null;

    return { session, user };
}

export async function invalidateSession() {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie) return;
    
    // We try to revoke in DB if valid
    const sessionData = await validateRequest();
    if (sessionData) {
        await db.update(sessions)
            .set({ revokedAt: new Date() })
            .where(eq(sessions.id, sessionData.session.id));
    }
    
    cookieStore.delete(COOKIE_NAME);
}
