
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, authenticators, sessions, webauthnChallenges } from '@/db/schema';
import { headers } from 'next/headers';

export async function POST(request: Request) {
    const token = (await headers()).get('X-Talos-Bootstrap-Token');
    if (token !== process.env.TALOS_BOOTSTRAP_TOKEN) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.delete(sessions);
    await db.delete(webauthnChallenges);
    await db.delete(authenticators);
    await db.delete(users);

    return NextResponse.json({ success: true, message: 'DB Reset' });
}
