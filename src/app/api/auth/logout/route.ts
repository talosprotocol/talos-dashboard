
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/auth/session';
import { headers } from 'next/headers';

const EXPECTED_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000';

export async function POST(_request: Request) {
    // 1. Check Origin (CSRF)
    const origin = (await headers()).get('origin');
    if (origin !== EXPECTED_ORIGIN) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    await invalidateSession();
    return NextResponse.json({ success: true });
}
