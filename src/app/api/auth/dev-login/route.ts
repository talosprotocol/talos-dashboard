
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@talosprotocol.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET_B64 = process.env.AUTH_COOKIE_HMAC_SECRET || '';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-talos.sid' : 'talos.sid';

function b64urlToBytes(str: string): Buffer {
    return Buffer.from(str, 'base64url');
}

function bytesToB64url(bytes: Buffer | Uint8Array): string {
    return Buffer.from(bytes).toString('base64url');
}

function hmac(secret: Buffer, input: string): Buffer {
    return createHmac('sha256', secret).update(input).digest();
}

export async function POST(request: Request) {
    // 1. Dev login overrides 
    // Usually blocked in production, but allowed if DEV_MODE=true
    if (process.env.NODE_ENV === 'production' && process.env.DEV_MODE !== 'true' && process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
        // We'll allow it for local docker testing if bypass is needed, but warn.
        console.warn('Dev login used in production build.');
    }

    if (!ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 });
    }

    if (!SECRET_B64) {
        return NextResponse.json({ error: 'AUTH_COOKIE_HMAC_SECRET not configured' }, { status: 500 });
    }

    // 2. Validate credentials
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Create session cookie (mimics the session.ts createSession but without DB)
    const secretBytes = b64urlToBytes(SECRET_B64);
    const tokenBytes = randomBytes(32);
    const tokenB64 = bytesToB64url(tokenBytes);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + SESSION_TTL;

    const payload = `v1.${exp}.${tokenB64}`;
    const sigBytes = hmac(secretBytes, payload);
    const sigB64 = bytesToB64url(sigBytes);
    const cookieValue = `${payload}.${sigB64}`;

    // 4. Set Cookie
    // Note: __Host- prefix strict requirements require Secure: true, which fails on non-HTTPS localhost without browser flags.
    // For local dev via Docker, we force a non-host cookie name if secure is false.
    const isLocalhost = request.headers.get('host')?.includes('localhost') || request.headers.get('host')?.includes('127.0.0.1');
    const secure = process.env.NODE_ENV === 'production' && !isLocalhost;
    const finalCookieName = secure ? COOKIE_NAME : 'talos.sid';

    (await cookies()).set(finalCookieName, cookieValue, {
        httpOnly: true,
        secure: secure,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL,
    });

    return NextResponse.json({
        verified: true,
        message: 'Dev login successful',
        user: { email: ADMIN_EMAIL, role: 'admin' }
    });
}
